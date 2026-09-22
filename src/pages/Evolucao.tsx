import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, TrendingDown, Trash2, Pencil, Sparkles, Ruler, Scale, CalendarDays,
  Activity, Trophy, Flame, Camera, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import EvolutionForm from "@/components/evolucao/EvolutionForm";
import { MEASURES, PHOTO_TYPES, PhotoRow, WeightRow, fmtDate } from "@/components/evolucao/types";

const daysBetween = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;

const Evolucao = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WeightRow[]>([]);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [height, setHeight] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WeightRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [compare, setCompare] = useState<{ a: string; b: string }>({ a: "", b: "" });

  const load = async () => {
    if (!user) return;
    const [{ data: w }, { data: p }, { data: prof }] = await Promise.all([
      supabase.from("weight_log").select("*").eq("user_id", user.id).order("logged_at", { ascending: true }),
      supabase.from("progress_photos").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("profiles").select("height_cm").eq("id", user.id).maybeSingle(),
    ]);
    const rows = (w ?? []) as WeightRow[];
    setLogs(rows);
    setPhotos((p ?? []) as PhotoRow[]);
    const h = prof?.height_cm ?? rows.filter((r) => r.height_cm).slice(-1)[0]?.height_cm ?? null;
    setHeight(h ? String(h) : "");

    const paths = (p ?? []).map((x) => x.photo_url);
    if (paths.length) {
      const { data: signed } = await supabase.storage.from("progress").createSignedUrls(paths, 3600);
      const map: Record<string, string> = {};
      signed?.forEach((s) => { if (s.signedUrl && s.path) map[s.path] = s.signedUrl; });
      setSignedUrls(map);
    } else {
      setSignedUrls({});
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` só depende de `user` (já coberto); incluí-la recriaria o efeito a cada render, pois sua identidade muda sempre.
  }, [user]);

  const photosByLog = useMemo(() => {
    const map: Record<string, PhotoRow[]> = {};
    photos.forEach((p) => {
      if (!p.weight_log_id) return;
      (map[p.weight_log_id] ||= []).push(p);
    });
    return map;
  }, [photos]);

  const logsWithPhotos = useMemo(
    () => logs.filter((l) => (photosByLog[l.id]?.length ?? 0) > 0),
    [logs, photosByLog]
  );

  useEffect(() => {
    if (logsWithPhotos.length >= 1 && !compare.a) {
      setCompare({ a: logsWithPhotos[0].id, b: logsWithPhotos[logsWithPhotos.length - 1].id });
    }
  }, [logsWithPhotos, compare.a]);

  const current = logs[logs.length - 1];
  const first = logs[0];
  const diff = current && first ? Number(current.weight_kg) - Number(first.weight_kg) : 0;
  const heightM = height ? Number(height) / 100 : 0;
  const imc = current && heightM ? Number(current.weight_kg) / (heightM * heightM) : 0;

  const chartData = logs.map((l) => ({
    date: fmtDate(l.logged_at),
    peso: Number(l.weight_kg),
    cintura: l.waist_cm ? Number(l.waist_cm) : null,
    braco: l.arm_cm ? Number(l.arm_cm) : null,
    quadril: l.hip_cm ? Number(l.hip_cm) : null,
    coxa: l.thigh_cm ? Number(l.thigh_cm) : null,
    peitoral: l.chest_cm ? Number(l.chest_cm) : null,
    pescoco: l.neck_cm ? Number(l.neck_cm) : null,
    gordura: l.body_fat_pct ? Number(l.body_fat_pct) : null,
  }));

  // Insights
  const insights = useMemo(() => {
    const out: string[] = [];
    if (logs.length === 0) return out;
    const now = Date.now();
    const recent = logs.filter((l) => now - new Date(l.logged_at).getTime() <= 60 * 86400000);
    const waistRows = recent.filter((l) => l.waist_cm);
    if (waistRows.length >= 2) {
      const d = Number(waistRows[waistRows.length - 1].waist_cm) - Number(waistRows[0].waist_cm);
      if (Math.abs(d) >= 0.5)
        out.push(`Você ${d < 0 ? "reduziu" : "aumentou"} ${Math.abs(d).toFixed(1)}cm de cintura nos últimos 60 dias.`);
    }
    if (logs.length >= 3) {
      const last3 = logs.slice(-3).map((l) => Number(l.weight_kg));
      const spread = Math.max(...last3) - Math.min(...last3);
      if (spread < 0.6) out.push("Seu peso está estável nas últimas semanas.");
      else if (last3[2] < last3[0]) out.push(`Tendência de queda: ${(last3[0] - last3[2]).toFixed(1)}kg nos últimos 3 registros.`);
      else out.push(`Tendência de ganho: ${(last3[2] - last3[0]).toFixed(1)}kg nos últimos 3 registros.`);
    }
    const last30 = logs.filter((l) => now - new Date(l.logged_at).getTime() <= 30 * 86400000).length;
    if (last30 >= 4) out.push("Você está registrando sua evolução com boa frequência. Continue assim!");
    else if (last30 > 0) out.push("Registrar ao menos 1x por semana deixa seus gráficos muito mais precisos.");
    if (logsWithPhotos.length >= 2) out.push("Você já tem fotos suficientes para comparar antes e depois.");
    return out;
  }, [logs, logsWithPhotos]);

  // Índice de evolução
  const evolutionIndex = useMemo(() => {
    if (logs.length === 0) return 0;
    const now = Date.now();
    const last30 = logs.filter((l) => now - new Date(l.logged_at).getTime() <= 30 * 86400000).length;
    const freq = Math.min(last30 / 4, 1) * 40;
    const consistency = Math.min(logs.length / 10, 1) * 30;
    const spanDays = logs.length > 1 ? daysBetween(logs[0].logged_at, logs[logs.length - 1].logged_at) : 0;
    const progress = Math.min(spanDays / 90, 1) * 20;
    const detail = Math.min(logsWithPhotos.length / 3, 1) * 10;
    return Math.round(freq + consistency + progress + detail);
  }, [logs, logsWithPhotos]);

  const streak = useMemo(() => {
    // semanas consecutivas com pelo menos 1 registro
    if (!logs.length) return 0;
    const weeks = new Set(
      logs.map((l) => {
        const d = new Date(l.logged_at);
        return `${d.getUTCFullYear()}-${Math.floor((d.getTime() / 86400000 + 4) / 7)}`;
      })
    );
    const nums = [...weeks].map((k) => Number(k.split("-")[1])).sort((a, b) => b - a);
    let s = 1;
    for (let i = 1; i < nums.length; i++) {
      if (nums[i - 1] - nums[i] === 1) s++;
      else break;
    }
    return s;
  }, [logs]);

  const spanDays = logs.length > 1 ? daysBetween(logs[0].logged_at, logs[logs.length - 1].logged_at) : 0;
  const achievements = [
    { label: "Primeiro registro realizado", done: logs.length >= 1, icon: Sparkles },
    { label: "5 registros de evolução", done: logs.length >= 5, icon: Activity },
    { label: "Primeira foto adicionada", done: photos.length >= 1, icon: Camera },
    { label: "30 dias acompanhando evolução", done: spanDays >= 30, icon: CalendarDays },
    { label: "Medidas completas em um registro", done: logs.some((l) => MEASURES.every((m) => l[m.key as keyof WeightRow])), icon: Ruler },
    { label: "90 dias de jornada", done: spanDays >= 90, icon: Trophy },
  ];

  const del = async () => {
    if (!deleteId) return;
    const paths = (photosByLog[deleteId] ?? []).map((p) => p.photo_url);
    if (paths.length) await supabase.storage.from("progress").remove(paths);
    const { error } = await supabase.from("weight_log").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    toast.success("Registro excluído");
    load();
  };

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (l: WeightRow) => { setEditing(l); setFormOpen(true); };

  const stat = (icon: React.ElementType, label: string, value: string, hint?: string) => {
    const Icon = icon;
    return (
      <Card className="border-border/60 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <Icon className="w-3.5 h-3.5 text-primary" /> {label}
          </div>
          <div className="font-display text-2xl font-bold text-foreground">{value}</div>
          {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
        </CardContent>
      </Card>
    );
  };

  const photoBlock = (logId: string) => {
    const log = logs.find((l) => l.id === logId);
    const ps = photosByLog[logId] ?? [];
    return (
      <div>
        <p className="text-xs text-muted-foreground mb-2">{log ? fmtDate(log.logged_at) : "—"}</p>
        <div className="grid grid-cols-3 gap-2">
          {PHOTO_TYPES.map((t) => {
            const ph = ps.find((x) => x.photo_type === t.key);
            return (
              <div key={t.key} className="aspect-[3/4] rounded-xl overflow-hidden bg-secondary/50 flex items-center justify-center">
                {ph && signedUrls[ph.photo_url] ? (
                  <img src={signedUrls[ph.photo_url]} alt={`Foto de evolução ${t.label}`} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[11px] text-muted-foreground">{t.label}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
              <TrendingDown className="w-3 h-3" /> Evolução
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              Sua jornada de transformação
            </h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl">
              Acompanhe seu progresso através de peso, medidas, fotos e evolução corporal ao longo do tempo.
            </p>
          </div>
          <Button onClick={openNew} size="lg" className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Registrar evolução
          </Button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {stat(Scale, "Peso atual", current ? `${Number(current.weight_kg).toFixed(1)} kg` : "—")}
          {stat(Ruler, "Altura", height ? `${(Number(height) / 100).toFixed(2)} m` : "—")}
          {stat(Activity, "IMC", imc ? imc.toFixed(1) : "—", imc ? (imc < 18.5 ? "Abaixo" : imc < 25 ? "Adequado" : imc < 30 ? "Acima" : "Elevado") : "Informe a altura")}
          {stat(CalendarDays, "Último registro", current ? fmtDate(current.logged_at) : "—")}
          {stat(TrendingDown, "Desde o início", logs.length > 1 ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg` : "—")}
        </div>

        {/* Índice + gamificação */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="border-border/60 bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Índice de evolução</span>
                <Flame className="w-4 h-4 text-primary" />
              </div>
              <div className="font-display text-4xl font-bold text-primary">{evolutionIndex}%</div>
              <Progress value={evolutionIndex} className="mt-3 h-2" />
              <p className="text-[11px] text-muted-foreground mt-2">
                Baseado na sua frequência e consistência de registros. Indicador motivacional, não é avaliação de saúde.
              </p>
              <div className="mt-3 text-xs text-foreground">
                🔥 Sequência: <strong>{streak}</strong> {streak === 1 ? "semana" : "semanas"}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 md:col-span-2">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="font-display font-semibold">Insights</h2>
              </div>
              {insights.length ? (
                <ul className="space-y-2">
                  {insights.map((i) => (
                    <li key={i} className="text-sm text-foreground flex gap-2">
                      <span className="text-primary">•</span> {i}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Faça seu primeiro registro para começar a receber análises automáticas da sua evolução.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60 mb-6">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-primary" />
              <h2 className="font-display font-semibold">Conquistas</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {achievements.map((a) => (
                <Badge
                  key={a.label}
                  variant={a.done ? "default" : "secondary"}
                  className={`gap-1.5 py-1.5 px-3 font-normal ${a.done ? "" : "opacity-60"}`}
                >
                  <a.icon className="w-3 h-3" /> {a.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gráficos */}
        <Card className="border-border/60 mb-6">
          <CardContent className="p-4 sm:p-5">
            <Tabs defaultValue="peso">
              <TabsList className="w-full grid grid-cols-4 mb-4">
                <TabsTrigger value="peso">Peso</TabsTrigger>
                <TabsTrigger value="medidas">Medidas</TabsTrigger>
                <TabsTrigger value="corpo">Corpo</TabsTrigger>
                <TabsTrigger value="fotos">Fotos</TabsTrigger>
              </TabsList>

              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">
                  Nenhum dado ainda. Clique em “Registrar evolução” para começar.
                </p>
              ) : (
                <>
                  <TabsContent value="peso">
                    <div className="h-64 sm:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis dataKey="date" fontSize={11} />
                          <YAxis fontSize={11} domain={["auto", "auto"]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>

                  <TabsContent value="medidas">
                    <div className="h-64 sm:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis dataKey="date" fontSize={11} />
                          <YAxis fontSize={11} domain={["auto", "auto"]} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="cintura" name="Cintura" stroke="hsl(var(--primary))" strokeWidth={2} connectNulls dot={{ r: 2 }} />
                          <Line type="monotone" dataKey="braco" name="Braço" stroke="hsl(var(--accent))" strokeWidth={2} connectNulls dot={{ r: 2 }} />
                          <Line type="monotone" dataKey="quadril" name="Quadril" stroke="hsl(var(--primary-glow))" strokeWidth={2} connectNulls dot={{ r: 2 }} />
                          <Line type="monotone" dataKey="coxa" name="Coxa" stroke="hsl(var(--muted-foreground))" strokeWidth={2} connectNulls dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>

                  <TabsContent value="corpo">
                    <div className="h-64 sm:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis dataKey="date" fontSize={11} />
                          <YAxis fontSize={11} domain={["auto", "auto"]} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="hsl(var(--primary))" strokeWidth={2.5} connectNulls dot={{ r: 2 }} />
                          <Line type="monotone" dataKey="gordura" name="Gordura (%)" stroke="hsl(var(--accent))" strokeWidth={2} connectNulls dot={{ r: 2 }} />
                          <Line type="monotone" dataKey="peitoral" name="Peitoral" stroke="hsl(var(--primary-glow))" strokeWidth={2} connectNulls dot={{ r: 2 }} />
                          <Line type="monotone" dataKey="pescoco" name="Pescoço" stroke="hsl(var(--muted-foreground))" strokeWidth={2} connectNulls dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>

                  <TabsContent value="fotos">
                    {logsWithPhotos.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-10 text-center">
                        Adicione fotos ao registrar sua evolução para comparar antes e depois.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          {(["a", "b"] as const).map((slot) => (
                            <div key={slot}>
                              <label className="text-xs text-muted-foreground mb-1 block">
                                {slot === "a" ? "Antes" : "Depois"}
                              </label>
                              <div className="relative">
                                <select
                                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm appearance-none"
                                  value={compare[slot]}
                                  onChange={(e) => setCompare((c) => ({ ...c, [slot]: e.target.value }))}
                                >
                                  {logsWithPhotos.map((l) => (
                                    <option key={l.id} value={l.id}>{fmtDate(l.logged_at)}</option>
                                  ))}
                                </select>
                                <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 pointer-events-none text-muted-foreground" />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {compare.a && photoBlock(compare.a)}
                          {compare.b && photoBlock(compare.b)}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>

        {/* Histórico */}
        <Card className="border-border/60">
          <CardContent className="p-5">
            <h2 className="font-display font-semibold mb-3">Histórico</h2>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
            ) : (
              <div className="space-y-2">
                {[...logs].reverse().map((l) => {
                  const ps = photosByLog[l.id] ?? [];
                  const open = expanded === l.id;
                  return (
                    <div key={l.id} className="rounded-xl bg-secondary/40 border border-border/40 overflow-hidden">
                      <div className="flex items-center justify-between p-3 gap-2">
                        <button className="text-left flex-1" onClick={() => setExpanded(open ? null : l.id)}>
                          <div className="font-semibold text-sm">{Number(l.weight_kg).toFixed(1)} kg</div>
                          <div className="text-xs text-muted-foreground">
                            {fmtDate(l.logged_at)}
                            {l.waist_cm ? ` · cintura ${l.waist_cm}cm` : ""}
                            {ps.length ? ` · ${ps.length} foto(s)` : ""}
                          </div>
                        </button>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" aria-label="Ver detalhes" onClick={() => setExpanded(open ? null : l.id)}>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Editar registro" onClick={() => openEdit(l)}>
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Excluir registro" onClick={() => setDeleteId(l.id)}>
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                      {open && (
                        <div className="px-3 pb-4 space-y-3 animate-in fade-in">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {MEASURES.map((m) => {
                              const v = l[m.key as keyof WeightRow];
                              if (!v) return null;
                              return (
                                <div key={m.key} className="rounded-lg bg-background p-2">
                                  <div className="text-[11px] text-muted-foreground">{m.label}</div>
                                  <div className="text-sm font-semibold">{Number(v)} cm</div>
                                </div>
                              );
                            })}
                            {l.body_fat_pct && (
                              <div className="rounded-lg bg-background p-2">
                                <div className="text-[11px] text-muted-foreground">Gordura</div>
                                <div className="text-sm font-semibold">{Number(l.body_fat_pct)}%</div>
                              </div>
                            )}
                          </div>
                          {(() => {
                            const idx = logs.findIndex((x) => x.id === l.id);
                            const prev = idx > 0 ? logs[idx - 1] : null;
                            if (!prev) return <p className="text-xs text-muted-foreground">Primeiro registro — base da sua jornada.</p>;
                            const dw = Number(l.weight_kg) - Number(prev.weight_kg);
                            const dwaist = l.waist_cm && prev.waist_cm ? Number(l.waist_cm) - Number(prev.waist_cm) : null;
                            const gap = Math.round(daysBetween(prev.logged_at, l.logged_at));
                            return (
                              <p className="text-xs text-muted-foreground">
                                Progresso automático: {dw >= 0 ? "+" : ""}{dw.toFixed(1)} kg
                                {dwaist !== null ? ` · cintura ${dwaist >= 0 ? "+" : ""}${dwaist.toFixed(1)} cm` : ""}
                                {" "}em {gap} dia(s) desde o registro anterior.
                              </p>
                            );
                          })()}
                          {ps.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 max-w-md">
                              {ps.map((p) => (
                                <img
                                  key={p.id}
                                  src={signedUrls[p.photo_url]}
                                  alt={`Foto ${p.photo_type} de ${fmtDate(l.logged_at)}`}
                                  className="aspect-[3/4] w-full object-cover rounded-lg"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {user && (
        <EvolutionForm
          open={formOpen}
          onOpenChange={setFormOpen}
          userId={user.id}
          editing={editing}
          editingPhotos={editing ? photosByLog[editing.id] ?? [] : []}
          defaultHeight={height}
          signedUrls={signedUrls}
          onSaved={load}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. As fotos deste registro também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={del}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default Evolucao;