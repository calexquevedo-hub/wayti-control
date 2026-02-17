import type { Demand, ReportSnapshot } from "@/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function exportReportCSV(demands: Demand[], snapshots: ReportSnapshot[]) {
  const lines: string[] = [];
  lines.push("Relatório Executivo");
  lines.push("Período,Orçamento Total,Gasto Real,Projetos em Risco,Entregas no Prazo");

  snapshots.forEach((snapshot) => {
    lines.push(
      [
        snapshot.period,
        snapshot.totalBudget,
        snapshot.totalSpent,
        snapshot.riskCount,
        `${snapshot.onTimePercentage}%`,
      ].join(",")
    );
  });

  lines.push("");
  lines.push("Demandas");
  lines.push("ID,Nome,Tipo,Status,Patrocinador,Orçamento,Gasto,Progresso,Última Atualização");

  demands.forEach((demand) => {
    lines.push(
      [
        demand.id,
        demand.name,
        demand.type,
        demand.status,
        demand.sponsor,
        demand.budget,
        demand.spent,
        `${demand.progress}%`,
        demand.lastUpdate.toISOString().slice(0, 10),
      ].join(",")
    );
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-ti-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportReportPDF(demands: Demand[], snapshots: ReportSnapshot[]) {
  const printable = window.open("", "_blank", "width=900,height=700");
  if (!printable) return;

  const snapshot = snapshots[0];
  const rows = demands
    .map(
      (demand) => `
        <tr>
          <td>${demand.id}</td>
          <td>${demand.name}</td>
          <td>${demand.type}</td>
          <td>${demand.status}</td>
          <td>${demand.sponsor}</td>
          <td>${formatCurrency(demand.budget)}</td>
          <td>${formatCurrency(demand.spent)}</td>
          <td>${demand.progress}%</td>
          <td>${demand.lastUpdate.toLocaleDateString("pt-BR")}</td>
        </tr>
      `
    )
    .join("");

  printable.document.write(`
    <html>
      <head>
        <title>Relatório TI</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
          h1 { margin: 0 0 8px; }
          .subtitle { color: #475569; margin-bottom: 24px; }
          .summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
          .card { border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
          th { background: #f1f5f9; text-align: left; }
        </style>
      </head>
      <body>
        <h1>Relatório Executivo de Demandas TI</h1>
        <div class="subtitle">Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
        <div class="summary">
          <div class="card">Orçamento Total: ${formatCurrency(snapshot?.totalBudget ?? 0)}</div>
          <div class="card">Gasto Real: ${formatCurrency(snapshot?.totalSpent ?? 0)}</div>
          <div class="card">Projetos em Risco: ${snapshot?.riskCount ?? 0}</div>
          <div class="card">Entregas no Prazo: ${snapshot?.onTimePercentage ?? 0}%</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Patrocinador</th>
              <th>Orçamento</th>
              <th>Gasto</th>
              <th>Progresso</th>
              <th>Atualização</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `);
  printable.document.close();
  printable.focus();
  printable.print();
}
