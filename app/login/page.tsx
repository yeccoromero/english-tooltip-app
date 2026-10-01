import { signInWithEmail, signInWithGoogle } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { error, sent } = await searchParams;
  return (
    <main className="login">
      <h1>English Tooltip</h1>
      <p className="muted">Repasa el vocabulario que guardas mientras lees en inglés.</p>

      <form action={signInWithGoogle}>
        <button className="btn primary" type="submit">Continuar con Google</button>
      </form>
      <div className="divider">o con tu correo</div>
      <form action={signInWithEmail}>
        <input type="email" name="email" placeholder="tu@correo.com" required autoComplete="email" />
        <button className="btn" type="submit">Enviarme un enlace</button>
      </form>

      {sent && <div className="notice ok">Te enviamos un enlace. Ábrelo desde este mismo navegador.</div>}
      {error && <div className="notice err">No se pudo iniciar sesión. Inténtalo de nuevo.</div>}
    </main>
  );
}
