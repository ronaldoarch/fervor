import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as adminApi from '../services/adminApi'
import type { AdminStats, AdminUser } from '../services/adminApi'
import './Admin.css'

export default function Admin() {
  const { user, logout } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [openaiModel, setOpenaiModel] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState<string | null>(null)
  const [userAction, setUserAction] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState<Record<string, string>>({})

  const loadAll = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const [u, s, cfg] = await Promise.all([
        adminApi.getAdminUsers(),
        adminApi.getAdminStats(),
        adminApi.getAdminSettings(),
      ])
      setUsers(u)
      setStats(s)
      setSystemPrompt(cfg.systemPrompt)
      setOpenaiModel(cfg.openaiModel)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar o painel')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    setSettingsSaved(null)
    setError(null)
    try {
      await adminApi.putAdminSettings({
        systemPrompt,
        openaiModel,
      })
      setSettingsSaved('Configurações salvas. Novas conversas do chat usarão este prompt e modelo.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleResetPrompt = async () => {
    if (!confirm('Remover o prompt personalizado e voltar ao padrão do servidor?')) return
    setSavingSettings(true)
    setError(null)
    try {
      await adminApi.putAdminSettings({ systemPrompt: '' })
      setSystemPrompt('')
      setSettingsSaved('Prompt padrão restaurado.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao restaurar')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleResetModel = async () => {
    if (!confirm('Remover o modelo personalizado e usar OPENAI_MODEL do servidor (ou gpt-4o)?')) return
    setSavingSettings(true)
    setError(null)
    try {
      await adminApi.putAdminSettings({ openaiModel: '' })
      setOpenaiModel('')
      setSettingsSaved('Modelo padrão restaurado.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao restaurar')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleRoleChange = async (id: string, role: string) => {
    setUserAction(id)
    setError(null)
    setSettingsSaved(null)
    try {
      await adminApi.patchAdminUser(id, { role })
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao atualizar papel')
    } finally {
      setUserAction(null)
    }
  }

  const handleNameBlur = async (id: string, currentName: string) => {
    const raw = nameDraft[id] !== undefined ? nameDraft[id] : currentName
    const next = raw.trim()
    if (!next || next === currentName) {
      setNameDraft((d) => {
        const copy = { ...d }
        delete copy[id]
        return copy
      })
      return
    }
    setUserAction(id)
    setError(null)
    setSettingsSaved(null)
    try {
      await adminApi.patchAdminUser(id, { name: next })
      setNameDraft((d) => {
        const copy = { ...d }
        delete copy[id]
        return copy
      })
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao atualizar nome')
    } finally {
      setUserAction(null)
    }
  }

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Excluir permanentemente o usuário ${email}?`)) return
    setUserAction(id)
    setError(null)
    setSettingsSaved(null)
    try {
      await adminApi.deleteAdminUser(id)
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir')
    } finally {
      setUserAction(null)
    }
  }

  const maxDayCount = stats?.messagesByDay?.length
    ? Math.max(...stats.messagesByDay.map((d) => d.count), 1)
    : 1

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/" className="back-link">← Voltar ao Fervô</Link>
        <div className="admin-user">
          <span>{user?.name}</span>
          <button type="button" onClick={logout}>Sair</button>
        </div>
      </header>

      <main className="admin-main">
        <h1>Painel Administrativo</h1>
        <p className="admin-subtitle">Gerencie usuários, o comportamento do agente e visualize métricas.</p>

        {error && <div className="admin-alert admin-alert--error">{error}</div>}
        {settingsSaved && <div className="admin-alert admin-alert--ok">{settingsSaved}</div>}

        {loading ? (
          <p className="admin-loading">Carregando dados…</p>
        ) : (
          <div className="admin-cards">
            <section className="admin-card admin-card--wide">
              <h2>Usuários</h2>
              <p className="card-meta">{users.length} cadastrado(s)</p>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Papel</th>
                      <th>Cadastro</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <input
                            type="text"
                            className="admin-input-inline"
                            value={nameDraft[u.id] !== undefined ? nameDraft[u.id] : u.name}
                            disabled={userAction === u.id}
                            onChange={(ev) =>
                              setNameDraft((d) => ({ ...d, [u.id]: ev.target.value }))
                            }
                            onBlur={() => void handleNameBlur(u.id, u.name)}
                          />
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <select
                            className="admin-select"
                            value={u.role}
                            disabled={userAction === u.id || u.id === user?.id}
                            onChange={(ev) => void handleRoleChange(u.id, ev.target.value)}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="admin-muted">
                          {new Date(u.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-admin-danger"
                            disabled={userAction === u.id || u.id === user?.id}
                            onClick={() => void handleDeleteUser(u.id, u.email)}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="card-hint">Você não pode alterar ou excluir a própria conta aqui. É obrigatório existir pelo menos um admin.</p>
            </section>

            <section className="admin-card admin-card--wide">
              <h2>Configurações do agente</h2>
              <p className="card-meta">Prompt de sistema enviado à OpenAI em cada conversa. Deixe em branco e salve para usar o padrão do código.</p>
              <label className="admin-label" htmlFor="system-prompt">Prompt do sistema (Fervô)</label>
              <textarea
                id="system-prompt"
                className="admin-textarea"
                rows={14}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Vazio = usar prompt padrão embutido no servidor"
              />
              <label className="admin-label" htmlFor="openai-model">Modelo OpenAI</label>
              <input
                id="openai-model"
                type="text"
                className="admin-input"
                value={openaiModel}
                onChange={(e) => setOpenaiModel(e.target.value)}
                placeholder="Ex.: gpt-4o — vazio = OPENAI_MODEL no .env ou gpt-4o"
              />
              <div className="admin-actions">
                <button
                  type="button"
                  className="btn-admin-primary"
                  disabled={savingSettings}
                  onClick={() => void handleSaveSettings()}
                >
                  {savingSettings ? 'Salvando…' : 'Salvar configurações'}
                </button>
                <button type="button" className="btn-admin-secondary" disabled={savingSettings} onClick={() => void handleResetPrompt()}>
                  Restaurar prompt padrão
                </button>
                <button type="button" className="btn-admin-secondary" disabled={savingSettings} onClick={() => void handleResetModel()}>
                  Restaurar modelo padrão
                </button>
              </div>
            </section>

            <section className="admin-card admin-card--wide">
              <h2>Analytics</h2>
              {stats && (
                <>
                  <div className="admin-stats-grid">
                    <div className="admin-stat">
                      <span className="admin-stat-value">{stats.userCount}</span>
                      <span className="admin-stat-label">Usuários</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-value">{stats.conversationCount}</span>
                      <span className="admin-stat-label">Conversas</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-value">{stats.messageCount}</span>
                      <span className="admin-stat-label">Mensagens</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-value">{stats.assistantReplyCount}</span>
                      <span className="admin-stat-label">Respostas do Fervô</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-value">{stats.usersLast14Days}</span>
                      <span className="admin-stat-label">Novos usuários (14 dias)</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-value">{stats.conversationsLast14Days}</span>
                      <span className="admin-stat-label">Novas conversas (14 dias)</span>
                    </div>
                  </div>
                  <h3 className="admin-subheading">Mensagens por dia (14 dias)</h3>
                  <div className="admin-chart">
                    {stats.messagesByDay.length === 0 ? (
                      <p className="admin-muted">Sem dados neste período.</p>
                    ) : (
                      stats.messagesByDay.map((d) => (
                        <div key={d.day} className="admin-chart-row">
                          <span className="admin-chart-day">{d.day}</span>
                          <div className="admin-chart-bar-wrap">
                            <div
                              className="admin-chart-bar"
                              style={{ width: `${Math.round((d.count / maxDayCount) * 100)}%` }}
                            />
                          </div>
                          <span className="admin-chart-count">{d.count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
