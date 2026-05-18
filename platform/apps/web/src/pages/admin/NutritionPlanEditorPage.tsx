import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useNutritionPlan, useUpdateNutritionPlan } from '@/api/admin';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { PageHeader } from '@/components/PageHeader';
import { Empty } from '@/components/ui/Empty';
import { getApiErrorMessage } from '@/lib/apiError';

interface FoodDraft {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
}

interface MealDraft {
  order: number;
  name: string;
  time: string;
  notes: string;
  foods: FoodDraft[];
}

export function NutritionPlanEditorPage() {
  const { id = '' } = useParams();
  const { data, isLoading } = useNutritionPlan(id);
  const update = useUpdateNutritionPlan();

  const [name, setName] = useState('');
  const [calories, setCalories] = useState(0);
  const [proteinG, setProteinG] = useState(0);
  const [carbsG, setCarbsG] = useState(0);
  const [fatsG, setFatsG] = useState(0);
  const [waterMl, setWaterMl] = useState(0);
  const [notes, setNotes] = useState('');
  const [meals, setMeals] = useState<MealDraft[]>([]);

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setCalories(data.calories);
    setProteinG(data.proteinG);
    setCarbsG(data.carbsG);
    setFatsG(data.fatsG);
    setWaterMl(data.waterMl);
    setNotes(data.notes ?? '');
    setMeals(
      (data.meals ?? []).map((m) => ({
        order: m.order,
        name: m.name,
        time: m.time ?? '',
        notes: m.notes ?? '',
        foods: m.foods.map((f) => ({
          name: f.name,
          quantity: f.quantity,
          unit: f.unit,
          calories: f.calories,
          proteinG: f.proteinG,
          carbsG: f.carbsG,
          fatsG: f.fatsG,
        })),
      })),
    );
  }, [data]);

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="Nutrition plan" />
        <div className="grid h-32 place-items-center text-ink-200">Loading...</div>
      </div>
    );
  }

  function addMeal() {
    setMeals((m) => [...m, { order: m.length, name: `Meal ${m.length + 1}`, time: '', notes: '', foods: [] }]);
  }
  function removeMeal(i: number) {
    setMeals((m) => m.filter((_, idx) => idx !== i));
  }
  function updateMeal(i: number, patch: Partial<MealDraft>) {
    setMeals((m) => m.map((meal, idx) => (idx === i ? { ...meal, ...patch } : meal)));
  }
  function addFood(mealIndex: number) {
    setMeals((m) =>
      m.map((meal, i) =>
        i === mealIndex
          ? {
              ...meal,
              foods: [
                ...meal.foods,
                { name: '', quantity: 100, unit: 'g', calories: 0, proteinG: 0, carbsG: 0, fatsG: 0 },
              ],
            }
          : meal,
      ),
    );
  }
  function updateFood(mealIndex: number, foodIndex: number, patch: Partial<FoodDraft>) {
    setMeals((m) =>
      m.map((meal, i) =>
        i === mealIndex
          ? {
              ...meal,
              foods: meal.foods.map((f, j) => (j === foodIndex ? { ...f, ...patch } : f)),
            }
          : meal,
      ),
    );
  }
  function removeFood(mealIndex: number, foodIndex: number) {
    setMeals((m) =>
      m.map((meal, i) =>
        i === mealIndex ? { ...meal, foods: meal.foods.filter((_, j) => j !== foodIndex) } : meal,
      ),
    );
  }

  function save() {
    update.mutate(
      {
        id,
        body: {
          name,
          calories,
          proteinG,
          carbsG,
          fatsG,
          waterMl,
          mealsPerDay: meals.length,
          notes: notes || null,
          meals: meals.map((m, i) => ({
            order: i,
            name: m.name,
            time: m.time || null,
            notes: m.notes || null,
            foods: m.foods.map((f, j) => ({
              name: f.name,
              quantity: f.quantity,
              unit: f.unit,
              calories: f.calories,
              proteinG: f.proteinG,
              carbsG: f.carbsG,
              fatsG: f.fatsG,
              alternatives: [],
              order: j,
            })),
          })),
        },
      },
      {
        onSuccess: () => toast.success('Plan saved'),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit nutrition plan"
        description={data.member ? `For ${data.member.fullName}` : 'Template'}
        actions={
          <>
            <Link to="/admin/nutrition-plans">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button loading={update.isPending} onClick={save}>
              <Save className="h-4 w-4" />
              Save
            </Button>
          </>
        }
      />

      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Field label="Plan name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Daily calories">
            <Input type="number" value={calories} onChange={(e) => setCalories(Number(e.target.value))} />
          </Field>
          <Field label="Water (ml)">
            <Input type="number" value={waterMl} onChange={(e) => setWaterMl(Number(e.target.value))} />
          </Field>
          <Field label="Protein (g)">
            <Input type="number" value={proteinG} onChange={(e) => setProteinG(Number(e.target.value))} />
          </Field>
          <Field label="Carbs (g)">
            <Input type="number" value={carbsG} onChange={(e) => setCarbsG(Number(e.target.value))} />
          </Field>
          <Field label="Fats (g)">
            <Input type="number" value={fatsG} onChange={(e) => setFatsG(Number(e.target.value))} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </Field>
        </div>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Meals</h2>
        <Button size="sm" variant="secondary" onClick={addMeal}>
          <Plus className="h-4 w-4" />
          Add meal
        </Button>
      </div>

      {meals.length === 0 ? (
        <Empty title="No meals yet" action={<Button onClick={addMeal}>Add first meal</Button>} />
      ) : (
        <div className="grid gap-4">
          {meals.map((meal, mi) => (
            <Card key={mi}>
              <div className="mb-3 grid gap-3 sm:grid-cols-3">
                <Field label="Meal name">
                  <Input value={meal.name} onChange={(e) => updateMeal(mi, { name: e.target.value })} />
                </Field>
                <Field label="Time">
                  <Input
                    value={meal.time}
                    onChange={(e) => updateMeal(mi, { time: e.target.value })}
                    placeholder="08:00"
                  />
                </Field>
                <Field label="Notes">
                  <Input value={meal.notes} onChange={(e) => updateMeal(mi, { notes: e.target.value })} />
                </Field>
              </div>
              <div className="space-y-3">
                {meal.foods.map((food, fi) => (
                  <div key={fi} className="rounded-xl border border-ink-700/60 bg-ink-800/40 p-3">
                    <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-7">
                      <Field label="Food">
                        <Input
                          value={food.name}
                          onChange={(e) => updateFood(mi, fi, { name: e.target.value })}
                          placeholder="Chicken breast"
                          className="md:col-span-2"
                        />
                      </Field>
                      <Field label="Qty">
                        <Input
                          type="number"
                          value={food.quantity}
                          onChange={(e) => updateFood(mi, fi, { quantity: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="Unit">
                        <Input
                          value={food.unit}
                          onChange={(e) => updateFood(mi, fi, { unit: e.target.value })}
                          placeholder="g"
                        />
                      </Field>
                      <Field label="kcal">
                        <Input
                          type="number"
                          value={food.calories}
                          onChange={(e) => updateFood(mi, fi, { calories: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="P">
                        <Input
                          type="number"
                          value={food.proteinG}
                          onChange={(e) => updateFood(mi, fi, { proteinG: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="C">
                        <Input
                          type="number"
                          value={food.carbsG}
                          onChange={(e) => updateFood(mi, fi, { carbsG: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="F">
                        <Input
                          type="number"
                          value={food.fatsG}
                          onChange={(e) => updateFood(mi, fi, { fatsG: Number(e.target.value) })}
                        />
                      </Field>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" variant="ghost" onClick={() => removeFood(mi, fi)}>
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => addFood(mi)}>
                  <Plus className="h-4 w-4" />
                  Add food
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeMeal(mi)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                  Remove meal
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
