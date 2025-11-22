/**
 * k6 Load Testing Script
 * Tests SCHNITTWERK booking flow and critical endpoints
 *
 * Run: k6 run k6-load-test.js
 * Run with report: k6 run --out json=test-results.json k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const bookingSuccessRate = new Rate('booking_success_rate');
const checkoutSuccessRate = new Rate('checkout_success_rate');
const apiResponseTime = new Trend('api_response_time');
const errorCounter = new Counter('errors');

// Test configuration
export const options = {
  // Test stages
  stages: [
    { duration: '1m', target: 10 },   // Ramp-up to 10 users
    { duration: '3m', target: 50 },   // Ramp-up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Peak load: 100 users
    { duration: '3m', target: 100 },  // Sustain peak
    { duration: '2m', target: 0 },    // Ramp-down
  ],

  // Thresholds (SLA)
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'], // 95% < 2s, 99% < 5s
    'http_req_failed': ['rate<0.01'],                   // Error rate < 1%
    'booking_success_rate': ['rate>0.95'],              // Booking success > 95%
    'checkout_success_rate': ['rate>0.98'],             // Checkout success > 98%
  },

  // Scenarios
  scenarios: {
    // Scenario 1: Browse services (60% of traffic)
    browse_services: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 60 },
        { duration: '5m', target: 60 },
        { duration: '2m', target: 0 },
      ],
      exec: 'browseServices',
    },

    // Scenario 2: Complete booking (30% of traffic)
    complete_booking: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 30 },
        { duration: '5m', target: 30 },
        { duration: '2m', target: 0 },
      ],
      exec: 'completeBooking',
    },

    // Scenario 3: Shop checkout (10% of traffic)
    shop_checkout: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 10 },
        { duration: '5m', target: 10 },
        { duration: '2m', target: 0 },
      ],
      exec: 'shopCheckout',
    },
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SALON_ID = __ENV.SALON_ID || '00000000-0000-0000-0000-000000000000';

/**
 * Scenario 1: Browse Services
 */
export function browseServices() {
  group('Browse Services Page', () => {
    // Load services page
    const servicesPage = http.get(`${BASE_URL}/leistungen`);
    check(servicesPage, {
      'services page loaded': (r) => r.status === 200,
      'services page response time OK': (r) => r.timings.duration < 2000,
    });

    sleep(1);

    // Fetch services API
    const servicesApi = http.get(`${BASE_URL}/api/services?salonId=${SALON_ID}`);
    apiResponseTime.add(servicesApi.timings.duration);

    check(servicesApi, {
      'services API responded': (r) => r.status === 200,
      'services API has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });

    sleep(2); // User reads
  });
}

/**
 * Scenario 2: Complete Booking
 */
export function completeBooking() {
  const testEmail = `test-${randomString(8)}@example.com`;
  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 7); // Book 1 week ahead
  const dateStr = testDate.toISOString().split('T')[0];

  group('Complete Booking Flow', () => {
    // Step 1: Check availability
    const availabilityReq = http.post(
      `${BASE_URL}/api/booking/availability`,
      JSON.stringify({
        salonId: SALON_ID,
        serviceIds: ['00000000-0000-0000-0000-000000000001'],
        date: dateStr,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const availabilityOk = check(availabilityReq, {
      'availability check succeeded': (r) => r.status === 200,
      'slots available': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.data.slots && body.data.slots.length > 0;
        } catch {
          return false;
        }
      },
    });

    if (!availabilityOk) {
      errorCounter.add(1);
      bookingSuccessRate.add(0);
      return;
    }

    sleep(3); // User selects slot

    // Step 2: Create reservation
    const reservationReq = http.post(
      `${BASE_URL}/api/booking/reserve`,
      JSON.stringify({
        salonId: SALON_ID,
        slotId: '00000000-0000-0000-0000-000000000002',
        sessionId: randomString(32),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    check(reservationReq, {
      'reservation created': (r) => r.status === 200,
    });

    sleep(5); // User fills form

    // Step 3: Create appointment
    const bookingReq = http.post(
      `${BASE_URL}/api/booking/create`,
      JSON.stringify({
        salonId: SALON_ID,
        customerEmail: testEmail,
        firstName: 'Load',
        lastName: 'Test',
        phone: '+41791234567',
        serviceIds: ['00000000-0000-0000-0000-000000000001'],
        startsAt: `${dateStr}T10:00:00Z`,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const bookingSuccess = check(bookingReq, {
      'booking created successfully': (r) => r.status === 200 || r.status === 201,
      'booking response time OK': (r) => r.timings.duration < 3000,
    });

    bookingSuccessRate.add(bookingSuccess ? 1 : 0);

    if (!bookingSuccess) {
      errorCounter.add(1);
    }
  });
}

/**
 * Scenario 3: Shop Checkout
 */
export function shopCheckout() {
  const testEmail = `shop-${randomString(8)}@example.com`;

  group('Shop Checkout Flow', () => {
    // Step 1: Browse products
    const productsReq = http.get(`${BASE_URL}/api/products?salonId=${SALON_ID}`);
    check(productsReq, {
      'products loaded': (r) => r.status === 200,
    });

    sleep(2); // User browses

    // Step 2: Add to cart
    const addToCartReq = http.post(
      `${BASE_URL}/api/cart/add`,
      JSON.stringify({
        productId: '00000000-0000-0000-0000-000000000003',
        quantity: 2,
        sessionId: randomString(32),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    check(addToCartReq, {
      'added to cart': (r) => r.status === 200,
    });

    sleep(3); // User reviews cart

    // Step 3: Checkout (create order)
    const checkoutReq = http.post(
      `${BASE_URL}/api/checkout/create`,
      JSON.stringify({
        salonId: SALON_ID,
        customerEmail: testEmail,
        shippingAddress: {
          street: 'Test Street 1',
          postalCode: '8001',
          city: 'Zürich',
          country: 'CH',
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const checkoutSuccess = check(checkoutReq, {
      'checkout succeeded': (r) => r.status === 200 || r.status === 201,
      'checkout response time OK': (r) => r.timings.duration < 3000,
    });

    checkoutSuccessRate.add(checkoutSuccess ? 1 : 0);

    if (!checkoutSuccess) {
      errorCounter.add(1);
    }
  });
}

/**
 * Setup function (runs once per VU)
 */
export function setup() {
  // Health check before starting test
  const healthCheck = http.get(`${BASE_URL}/api/health`);

  if (healthCheck.status !== 200) {
    throw new Error('Health check failed - system not healthy');
  }

  console.log('Health check passed - starting load test');
  return { startTime: new Date().toISOString() };
}

/**
 * Teardown function (runs once after all VUs finish)
 */
export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`);
}

/**
 * Handle summary - custom report generation
 */
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-summary.json': JSON.stringify(data, null, 2),
    'load-test-report.html': htmlReport(data),
  };
}

/**
 * Text summary for console output
 */
function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n';
  summary += `${indent}Load Test Summary\n`;
  summary += `${indent}=================\n\n`;

  // Metrics
  const metrics = data.metrics;

  if (metrics.http_reqs) {
    summary += `${indent}HTTP Requests:\n`;
    summary += `${indent}  Total: ${metrics.http_reqs.values.count}\n`;
    summary += `${indent}  Rate: ${metrics.http_reqs.values.rate.toFixed(2)}/s\n\n`;
  }

  if (metrics.http_req_duration) {
    summary += `${indent}Response Times:\n`;
    summary += `${indent}  Avg: ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  Min: ${metrics.http_req_duration.values.min.toFixed(2)}ms\n`;
    summary += `${indent}  Max: ${metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
    summary += `${indent}  P95: ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}  P99: ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  }

  if (metrics.http_req_failed) {
    const failRate = (metrics.http_req_failed.values.rate * 100).toFixed(2);
    summary += `${indent}Error Rate: ${failRate}%\n\n`;
  }

  if (metrics.booking_success_rate) {
    const successRate = (metrics.booking_success_rate.values.rate * 100).toFixed(2);
    summary += `${indent}Booking Success Rate: ${successRate}%\n`;
  }

  if (metrics.checkout_success_rate) {
    const successRate = (metrics.checkout_success_rate.values.rate * 100).toFixed(2);
    summary += `${indent}Checkout Success Rate: ${successRate}%\n`;
  }

  return summary;
}

/**
 * HTML report (basic)
 */
function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>SCHNITTWERK Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #f2f2f2; }
    .pass { color: green; font-weight: bold; }
    .fail { color: red; font-weight: bold; }
  </style>
</head>
<body>
  <h1>SCHNITTWERK Load Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>

  <h2>Summary</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
      <th>Status</th>
    </tr>
    <tr>
      <td>Total Requests</td>
      <td>${data.metrics.http_reqs?.values.count || 0}</td>
      <td>-</td>
    </tr>
    <tr>
      <td>Request Rate</td>
      <td>${(data.metrics.http_reqs?.values.rate || 0).toFixed(2)}/s</td>
      <td>-</td>
    </tr>
    <tr>
      <td>Avg Response Time</td>
      <td>${(data.metrics.http_req_duration?.values.avg || 0).toFixed(2)}ms</td>
      <td class="${(data.metrics.http_req_duration?.values.avg || 0) < 1000 ? 'pass' : 'fail'}">
        ${(data.metrics.http_req_duration?.values.avg || 0) < 1000 ? 'PASS' : 'FAIL'}
      </td>
    </tr>
    <tr>
      <td>P95 Response Time</td>
      <td>${(data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms</td>
      <td class="${(data.metrics.http_req_duration?.values['p(95)'] || 0) < 2000 ? 'pass' : 'fail'}">
        ${(data.metrics.http_req_duration?.values['p(95)'] || 0) < 2000 ? 'PASS' : 'FAIL'}
      </td>
    </tr>
    <tr>
      <td>Error Rate</td>
      <td>${((data.metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2)}%</td>
      <td class="${(data.metrics.http_req_failed?.values.rate || 0) < 0.01 ? 'pass' : 'fail'}">
        ${(data.metrics.http_req_failed?.values.rate || 0) < 0.01 ? 'PASS' : 'FAIL'}
      </td>
    </tr>
  </table>

  <h2>Detailed Metrics</h2>
  <pre>${JSON.stringify(data.metrics, null, 2)}</pre>
</body>
</html>
  `;
}
