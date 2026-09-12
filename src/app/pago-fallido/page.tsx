import Link from "next/link";

export default function PagoFallidoPage() {
  return (
    <div className="center-stage">
      <h1>El pago no se completó</h1>
      <p>Podés volver a intentarlo desde tu panel cuando quieras.</p>
      <Link href="/alumno/panel">
        <button className="primary">Volver a mi panel</button>
      </Link>
    </div>
  );
}
