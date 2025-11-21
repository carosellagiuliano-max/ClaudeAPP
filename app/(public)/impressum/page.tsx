import type { Metadata } from 'next'
import { getDefaultSalon } from '@/lib/db/queries'

export const metadata: Metadata = {
  title: 'Impressum',
  robots: { index: true, follow: true },
}

export default async function ImpressumPage() {
  const salon = await getDefaultSalon()

  return (
    <div className="container prose prose-gray mx-auto max-w-3xl py-16 dark:prose-invert">
      <h1>Impressum</h1>

      <h2>Angaben gemäss Art. 3 Abs. 1 UWG</h2>
      <p>
        <strong>{salon?.name}</strong>
        <br />
        {salon?.legal_entity_name}
        <br />
        {salon?.address_street}
        <br />
        {salon?.address_postal_code} {salon?.address_city}
        <br />
        {salon?.address_country}
      </p>

      <h2>Kontakt</h2>
      <p>
        Telefon: {salon?.phone}
        <br />
        E-Mail: {salon?.email}
        <br />
        Website: {salon?.website}
      </p>

      {salon?.tax_id && (
        <>
          <h2>Handelsregister</h2>
          <p>UID: {salon.tax_id}</p>
        </>
      )}

      <h2>Haftungsausschluss</h2>
      <p>
        Der Autor übernimmt keinerlei Gewähr hinsichtlich der inhaltlichen Richtigkeit, Genauigkeit,
        Aktualität, Zuverlässigkeit und Vollständigkeit der Informationen.
      </p>
    </div>
  )
}
