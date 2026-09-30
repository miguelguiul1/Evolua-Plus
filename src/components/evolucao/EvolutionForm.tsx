import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { PHOTO_TYPES, PhotoRow, WeightRow } from "./types";
import { useSyncModules } from "@/hooks/useNutrition";
import { RANGES, checkOptional, checkRange, firstError, parseNum } from "@/lib/validation";
import { PROGRESS_BUCKET, storagePathsOf } from "@/lib/progressPhotos";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  editing: WeightRow | null;
  editingPhotos: PhotoRow[];
  defaultHeight: string;
  signedUrls: Record<string, string>;
  onSaved: () => void;
};

const empty = {
  weight_kg: "", height_cm: "", waist_cm: "", arm_cm: "", hip_cm: "",
  thigh_cm: "", chest_cm: "", neck_cm: "", body_fat_pct: "",
};

const num = (v: string) => (v.trim() ? parseNum(v) : null);
const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

const EvolutionForm = ({
  open, onOpenChange, userId, editing, editingPhotos, defaultHeight, signedUrls, onSaved,
}: Props) => {
  const sync = useSyncModules();
  const [form, setForm] = useState({ ...empty });
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFiles({});
    if (editing) {
      setForm({
        weight_kg: str(editing.weight_kg),
        height_cm: str(editing.height_cm) || defaultHeight,
        waist_cm: str(editing.waist_cm),
        arm_cm: str(editing.arm_cm),
        hip_cm: str(editing.hip_cm),
        thigh_cm: str(editing.thigh_cm),
        chest_cm: str(editing.chest_cm),
        neck_cm: str(editing.neck_cm),
        body_fat_pct: str(editing.body_fat_pct),
      });
    } else {
      setForm({ ...empty, height_cm: defaultHeight });
    }
  }, [open, editing, defaultHeight]);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const uploadPhotos = async (logId: string) => {
    for (const t of PHOTO_TYPES) {
      const file = files[t.key];
      if (!file) continue;
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${logId}-${t.key}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(PROGRESS_BUCKET).upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const existing = editingPhotos.find((p) => p.photo_type === t.key);
      if (existing) {
        const oldPaths = storagePathsOf([existing.photo_url]);
        if (oldPaths.length) await supabase.storage.from(PROGRESS_BUCKET).remove(oldPaths);
        const { error } = await supabase.from("progress_photos").update({ photo_url: path }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("progress_photos").insert({
          user_id: userId, weight_log_id: logId, photo_type: t.key, photo_url: path,
        });
        if (error) {
          // Registro recusado (RLS/trigger): não deixa o arquivo órfão no bucket.
          await supabase.storage.from(PROGRESS_BUCKET).remove([path]);
          throw error;
        }
      }
    }
  };

  const save = async () => {
    const invalid = firstError([
      checkRange(form.weight_kg, RANGES.peso),
      checkOptional(form.height_cm, RANGES.altura),
      checkOptional(form.waist_cm, RANGES.medida),
      checkOptional(form.arm_cm, RANGES.medida),
      checkOptional(form.hip_cm, RANGES.medida),
      checkOptional(form.thigh_cm, RANGES.medida),
      checkOptional(form.chest_cm, RANGES.medida),
      checkOptional(form.neck_cm, RANGES.medida),
      checkOptional(form.body_fat_pct, RANGES.gordura),
    ]);
    if (invalid) return toast.error(invalid);
    const weight = num(form.weight_kg) as number;
    setSaving(true);
    try {
      const payload = {
        weight_kg: weight,
        height_cm: num(form.height_cm),
        waist_cm: num(form.waist_cm),
        arm_cm: num(form.arm_cm),
        hip_cm: num(form.hip_cm),
        thigh_cm: num(form.thigh_cm),
        chest_cm: num(form.chest_cm),
        neck_cm: num(form.neck_cm),
        body_fat_pct: num(form.body_fat_pct),
      };

      let logId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("weight_log").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("weight_log").insert({ ...payload, user_id: userId }).select("id").single();
        if (error) throw error;
        logId = data.id;
      }

      if (logId) await uploadPhotos(logId);
      if (payload.height_cm) {
        await supabase.from("profiles").update({ height_cm: payload.height_cm }).eq("id", userId);
      }

      toast.success(editing ? "Registro atualizado!" : "Evolução registrada com sucesso!");
      sync(["weight"]);
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error("Erro ao salvar", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const fields: { k: keyof typeof empty; label: string; step?: string }[] = [
    { k: "height_cm", label: "Altura (cm)" },
    { k: "waist_cm", label: "Cintura (cm)" },
    { k: "arm_cm", label: "Braço (cm)" },
    { k: "hip_cm", label: "Quadril (cm)" },
    { k: "thigh_cm", label: "Coxa (cm)" },
    { k: "chest_cm", label: "Peitoral (cm)" },
    { k: "neck_cm", label: "Pescoço (cm)" },
    { k: "body_fat_pct", label: "Gordura (%)" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editing ? "Editar registro" : "Registrar evolução"}
          </DialogTitle>
          <DialogDescription>Apenas o peso é obrigatório. Preencha o resto quando quiser.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium">Peso (kg) *</Label>
            <Input inputMode="decimal" type="number" step="0.1" value={form.weight_kg} onChange={set("weight_kg")} placeholder="80" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.k}>
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Input inputMode="decimal" type="number" step="0.1" value={form[f.k]} onChange={set(f.k)} />
              </div>
            ))}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Fotos de evolução</Label>
            <div className="grid grid-cols-3 gap-2">
              {PHOTO_TYPES.map((t) => {
                const picked = files[t.key];
                const existing = editingPhotos.find((p) => p.photo_type === t.key);
                const preview = picked ? URL.createObjectURL(picked) : existing ? signedUrls[existing.photo_url] : null;
                return (
                  <label
                    key={t.key}
                    className="relative aspect-[3/4] rounded-xl border border-dashed border-border bg-secondary/40 flex flex-col items-center justify-center gap-1 cursor-pointer overflow-hidden hover:border-primary/60 focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-colors"
                  >
                    {preview ? (
                      <img src={preview} alt={`Foto ${t.label}`} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">{t.label}</span>
                      </>
                    )}
                    {preview && (
                      <span className="absolute bottom-0 inset-x-0 bg-background/80 text-[11px] text-center py-0.5">{t.label}</span>
                    )}
                    <input
                      type="file" accept="image/*" className="sr-only"
                      onChange={(e) => setFiles((p) => ({ ...p, [t.key]: e.target.files?.[0] ?? null }))}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => onOpenChange(false)} disabled={saving}>
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button className="flex-1 gap-2" onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EvolutionForm;