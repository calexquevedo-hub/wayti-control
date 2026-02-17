import { useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2, LayoutList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface Task {
  _id?: string;
  title: string;
  isCompleted: boolean;
  assignee?: string;
}

interface DemandTasksProps {
  tasks: Task[];
  onUpdateTasks: (newTasks: Task[]) => void;
}

export function DemandTasks({ tasks, onUpdateTasks }: DemandTasksProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const progress =
    tasks.length > 0
      ? Math.round((tasks.filter((task) => task.isCompleted).length / tasks.length) * 100)
      : 0;

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = { title: newTaskTitle.trim(), isCompleted: false };
    onUpdateTasks([...tasks, newTask]);
    setNewTaskTitle("");
  };

  const toggleTask = (index: number) => {
    const updated = [...tasks];
    updated[index].isCompleted = !updated[index].isCompleted;
    onUpdateTasks(updated);
  };

  const removeTask = (index: number) => {
    const updated = tasks.filter((_, i) => i !== index);
    onUpdateTasks(updated);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border/60 bg-card/70 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <LayoutList className="h-4 w-4 text-primary" />
            Progresso do Projeto
          </h3>
          <span className="text-sm font-medium text-muted-foreground">{progress}% Concluído</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="rounded-lg border border-border/60 bg-background/40">
        <div className="flex gap-2 border-b border-border/60 p-4">
          <Input
            placeholder="Adicionar nova etapa (ex: Configurar DNS)..."
            value={newTaskTitle}
            onChange={(event) => setNewTaskTitle(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleAddTask()}
          />
          <Button onClick={handleAddTask}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </div>

        <div className="divide-y divide-border/60">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma tarefa criada. Comece planejando o projeto acima.
            </div>
          ) : null}

          {tasks.map((task, index) => (
            <div
              key={task._id ?? `${task.title}-${index}`}
              className={`flex items-center justify-between p-4 transition-colors hover:bg-muted/50 ${
                task.isCompleted ? "bg-muted/30" : ""
              }`}
            >
              <div
                className="flex flex-1 cursor-pointer items-center gap-3"
                onClick={() => toggleTask(index)}
              >
                {task.isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <span
                  className={`text-sm ${
                    task.isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {task.title}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeTask(index)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
