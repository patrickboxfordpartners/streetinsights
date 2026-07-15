import { useState, useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'
import { FileText, Copy, Check, Pencil, Trash2, X, ExternalLink, Activity } from 'lucide-react'
import { formatDateTime } from '../lib/utils'

interface ContentDraft {
  id: string
  source: string
  type: string
  title: string
  body: string
  metadata: Record<string, unknown>
  published_at: string | null
  created_at: string
}

type Platform = 'linkedin' | 'twitter'

const CHAR_LIMIT: Record<Platform, number> = {
  linkedin: 1300,
  twitter: 280,
}

const PLATFORM_LABEL: Record<Platform, string> = {
  linkedin: 'LinkedIn',
  twitter: 'Twitter / X',
}

export function ContentDrafts() {
  const [allDrafts, setAllDrafts] = useState<ContentDraft[]>([])
  const [platform, setPlatform] = useState<Platform>('linkedin')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<ContentDraft | null>(null)
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchDrafts()
  }, [])

  async function fetchDrafts() {
    const { data } = await supabase
      .from('content_drafts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setAllDrafts((data as unknown as ContentDraft[]) || [])
    setLoading(false)
  }

  const drafts = allDrafts.filter(d => d.type === platform)
  const charLimit = CHAR_LIMIT[platform]

  async function saveDraft() {
    if (!editing) return
    setSaving(true)
    const { error } = await supabase
      .from('content_drafts')
      .update({ body: editBody, updated_at: new Date().toISOString() })
      .eq('id', editing.id)
    if (!error) {
      setAllDrafts(d => d.map(x => x.id === editing.id ? { ...x, body: editBody } : x))
      setEditing(null)
    }
    setSaving(false)
  }

  async function deleteDraft(id: string) {
    setDeleting(id)
    await supabase.from('content_drafts').delete().eq('id', id)
    setAllDrafts(d => d.filter(x => x.id !== id))
    setDeleting(null)
  }

  async function markPublished(id: string) {
    await supabase.from('content_drafts').update({ status: 'published' }).eq('id', id)
    setAllDrafts(d => d.map(x => x.id === id ? { ...x, status: 'published' } : x))
  }

  function copyToClipboard(id: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Drafts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-generated posts from daily market signals
        </p>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-1 border-b">
        {(['linkedin', 'twitter'] as Platform[]).map(p => {
          const count = allDrafts.filter(d => d.type === p && !d.published_at).length
          return (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                platform === p
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {PLATFORM_LABEL[p]}
              {count > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {drafts.length === 0 ? (
        <div className="bg-card rounded-lg border shadow-sm p-16 text-center">
          <FileText className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-base font-bold mb-2">No {PLATFORM_LABEL[platform]} Drafts Yet</h3>
          <p className="text-sm text-muted-foreground">
            Drafts are auto-generated daily at 8 AM when spikes are detected.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className={`bg-card rounded-lg border shadow-sm overflow-hidden ${
                draft.published_at ? 'opacity-60' : ''
              }`}
            >
              <div className="px-5 py-3.5 border-b bg-accent/30 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{draft.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(draft.created_at)}
                    {draft.published_at && (
                      <span className="ml-2 text-green-500 font-semibold">Published</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => copyToClipboard(draft.id, draft.body)}
                    className="p-2 rounded-md hover:bg-accent transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied === draft.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => { setEditing(draft); setEditBody(draft.body) }}
                    className="p-2 rounded-md hover:bg-accent transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {!draft.published_at && (
                    <button
                      onClick={() => markPublished(draft.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Published
                    </button>
                  )}
                  <button
                    onClick={() => deleteDraft(draft.id)}
                    disabled={deleting === draft.id}
                    className="p-2 rounded-md hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="px-5 py-4">
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground/90">
                  {draft.body}
                </pre>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex gap-4">
                    {(draft.metadata.spike_count as number) != null && (
                      <span className="text-xs text-muted-foreground">
                        {draft.metadata.spike_count as number} spike{(draft.metadata.spike_count as number) !== 1 ? 's' : ''}
                      </span>
                    )}
                    {(draft.metadata.prediction_count as number) != null && (
                      <span className="text-xs text-muted-foreground">
                        {draft.metadata.prediction_count as number} prediction{(draft.metadata.prediction_count as number) !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-mono ${
                    draft.body.length > charLimit ? 'text-red-500 font-semibold' : 'text-muted-foreground'
                  }`}>
                    {draft.body.length} / {charLimit}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setEditing(null)}
        >
          <div className="bg-card rounded-lg border shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-lg font-bold">Edit Draft</h2>
              <button onClick={() => setEditing(null)} className="p-1 rounded-md hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 p-5 overflow-auto">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full h-64 px-3 py-2 bg-background border rounded-lg text-sm font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <p className={`text-xs mt-1.5 font-mono ${
                editBody.length > charLimit ? 'text-red-500 font-semibold' : 'text-muted-foreground'
              }`}>
                {editBody.length} / {charLimit} characters
                {editBody.length > charLimit && (
                  <span className="ml-1">
                    ({PLATFORM_LABEL[platform]} limit exceeded)
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveDraft}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
