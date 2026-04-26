import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { RubricDocument } from "@/lib/types";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

type CriterionDraft = {
  name: string;
  maxPoints: number;
  description: string;
};

export function RubricPage() {
  const [rubric, setRubric] = useState<RubricDocument | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newCriterion, setNewCriterion] = useState<CriterionDraft>({ name: "", maxPoints: 0, description: "" });

  useEffect(() => {
    void api.rubric().then(setRubric);
  }, []);

  const criterionEntries = useMemo(() => Object.entries(rubric?.criteria ?? {}), [rubric]);
  const allocatedPoints = criterionEntries.reduce((sum, [, criterion]) => sum + criterion.maxPoints, 0);
  const totalPoints = rubric?.total_points || allocatedPoints || 100;

  function updateCriterion(name: string, patch: Partial<CriterionDraft>) {
    setRubric((current) => {
      if (!current || !current.criteria[name]) return current;
      return {
        ...current,
        criteria: {
          ...current.criteria,
          [name]: {
            ...current.criteria[name],
            ...patch,
          },
        },
      };
    });
  }

  function removeCriterion(name: string) {
    setRubric((current) => {
      if (!current) return current;
      const nextCriteria = { ...current.criteria };
      delete nextCriteria[name];
      return { ...current, criteria: nextCriteria };
    });
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Rubric" description="Edit the rubric JSON that the grader loads from the backend." />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Rubric editor</CardTitle>
              <p className="text-sm text-muted-foreground">These changes write back to data/rubric.json.</p>
            </div>
            <Button variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add criterion
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="rubricName">Rubric name</Label>
                <Input
                  id="rubricName"
                  value={rubric?.name ?? ""}
                  onChange={(event) => setRubric((current) => (current ? { ...current, name: event.target.value } : current))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="totalPoints">Total points</Label>
                <Input
                  id="totalPoints"
                  type="number"
                  value={rubric?.total_points ?? 100}
                  onChange={(event) => setRubric((current) => (current ? { ...current, total_points: Number(event.target.value) || 0 } : current))}
                />
              </div>
            </div>

            {criterionEntries.map(([name, criterion]) => (
              <div key={name} className="rounded-xl border border-border bg-white p-4">
                <div className="grid gap-4 md:grid-cols-[1fr_160px_auto] md:items-start">
                  <div className="grid gap-2">
                    <Label htmlFor={`criterion-${name}`}>{name}</Label>
                    <Textarea
                      id={`criterion-${name}`}
                      value={criterion.description}
                      onChange={(event) => updateCriterion(name, { description: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`points-${name}`}>Max points</Label>
                    <Input
                      id={`points-${name}`}
                      type="number"
                      value={criterion.maxPoints}
                      onChange={(event) => updateCriterion(name, { maxPoints: Number(event.target.value) || 0 })}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="mt-6" onClick={() => removeCriterion(name)} aria-label={`Remove ${name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Progress value={(criterion.maxPoints / Math.max(totalPoints, 1)) * 100} className="mt-4" />
              </div>
            ))}

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {criterionEntries.length} criteria | {allocatedPoints} allocated points
              </div>
              <Button
                type="button"
                onClick={async () => {
                  if (!rubric) return;
                  const saved = await api.saveRubric(rubric);
                  setRubric(saved);
                  setSavedAt(new Date().toLocaleTimeString());
                }}
              >
                <Save className="h-4 w-4" />
                Save rubric
              </Button>
            </div>
            {savedAt ? <p className="text-xs text-muted-foreground">Saved at {savedAt}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rubric summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="text-sm text-muted-foreground">Name</div>
              <div className="mt-1 font-semibold">{rubric?.name ?? "Loading..."}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="text-sm text-muted-foreground">Criteria</div>
              <div className="mt-1 font-semibold">{criterionEntries.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="text-sm text-muted-foreground">Allocated points</div>
              <div className="mt-1 font-semibold">{allocatedPoints}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen} title="Add criterion" description="Append a new rubric criterion to the JSON document.">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!rubric || !newCriterion.name.trim()) return;
            setRubric({
              ...rubric,
              criteria: {
                ...rubric.criteria,
                [newCriterion.name.trim()]: {
                  maxPoints: newCriterion.maxPoints,
                  description: newCriterion.description,
                },
              },
            });
            setNewCriterion({ name: "", maxPoints: 0, description: "" });
            setAddOpen(false);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="newCriterionName">Name</Label>
            <Input id="newCriterionName" value={newCriterion.name} onChange={(event) => setNewCriterion((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="newCriterionPoints">Max points</Label>
            <Input
              id="newCriterionPoints"
              type="number"
              value={newCriterion.maxPoints}
              onChange={(event) => setNewCriterion((current) => ({ ...current, maxPoints: Number(event.target.value) || 0 }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="newCriterionDescription">Description</Label>
            <Textarea
              id="newCriterionDescription"
              value={newCriterion.description}
              onChange={(event) => setNewCriterion((current) => ({ ...current, description: event.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
