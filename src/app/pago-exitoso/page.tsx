import Link from "next/link";

export default function PagoExitosoPage() {
  return (
    <div className="center-stage">
      <h1>¡Pago recibido!</h1>
      <p>
        Gracias — en unos segundos Mercado Pago confirma el pago y tu cuota queda marcada
        automáticamente.
      </p>
      <Link href="/alumno/panel">
        <button className="primary">Volver a mi panel</button>
      </Link>
    </div>
  );
}
