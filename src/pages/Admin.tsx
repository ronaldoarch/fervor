import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Admin.css'

export default function Admin() {
  const { user, logout } = useAuth()

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/" className="back-link">← Voltar ao Fervor</Link>
        <div className="admin-user">
          <span>{user?.name}</span>
          <button onClick={logout}>Sair</button>
        </div>
      </header>

      <main className="admin-main">
        <h1>Painel Administrativo</h1>
        <p className="admin-subtitle">Bem-vindo ao painel de administração do Fervor.</p>

        <div className="admin-cards">
          <section className="admin-card">
            <h2>Usuários</h2>
            <p>Usuários cadastrados: 2 (demo)</p>
            <p className="card-hint">Em produção, integre com backend para gerenciar usuários.</p>
          </section>

          <section className="admin-card">
            <h2>Configurações</h2>
            <p>Configurações do agente e prompts.</p>
            <p className="card-hint">Personalize o comportamento do Estrategista Cultural.</p>
          </section>

          <section className="admin-card">
            <h2>Analytics</h2>
            <p>Métricas de uso e análises realizadas.</p>
            <p className="card-hint">Em produção, adicione tracking e relatórios.</p>
          </section>
        </div>
      </main>
    </div>
  )
}
