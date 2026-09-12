import Link from "next/link";

export default function PagoPendientePage() {
  return (
    <div className="center-stage">
      <h1>Pago pendiente</h1>
      <p>Tu pago está siendo procesado. Te va a quedar confirmado apenas Mercado Pago lo apruebe.</p>
      <Link href="/alumno/panel">
        <button className="primary">Volver a mi panel</button>
      </Link>
    </div>
  );
}
