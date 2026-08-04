import { useState, useEffect } from "react";
import { Container, Button, Modal, Form, Nav } from "react-bootstrap";
import Swal from "sweetalert2";
import ExcelJS from "exceljs";
import { isMobile } from "../../utils/device";
import { API } from "../../helpers/api";

const URL_ENTRENAMIENTOS = API.entrenamientos;

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES_NOMBRE = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const COLOR = "#3a7070";

const ACTIVIDADES = [
  { label: "Pileta", color: "#0077b6" },
  { label: "Aguas abiertas", color: "#00b4d8" },
  { label: "Gimnasio", color: "#e63946" },
  { label: "Bicicleta", color: "#2a9d8f" },
  { label: "Otra", color: "#6c757d" },
];

function colorActividad(label) {
  const l = (label || "").trim();
  return ACTIVIDADES.find((a) => a.label === l)?.color ?? "#6c757d";
}

function celdasMes(año, mes) {
  const totalDias = new Date(año, mes + 1, 0).getDate();
  const primerDiaSemana = new Date(año, mes, 1).getDay(); // 0 = Dom, 1 = Lun, ...
  const offsetInicial = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;
  
  const arr = [];
  for (let i = 0; i < offsetInicial; i++) {
    arr.push(null);
  }
  for (let d = 1; d <= totalDias; d++) {
    arr.push(d);
  }
  return arr;
}

function toKey(año, mes, dia) {
  return `${año}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function getSemanasDelMes(año, mes) {
  const totalDias = new Date(año, mes + 1, 0).getDate();
  const semanas = [];
  
  let diaActual = 1;
  let numeroSemana = 1;

  while (diaActual <= totalDias) {
    const fechaInicio = new Date(año, mes, diaActual);
    const dayOfWeek = fechaInicio.getDay();
    const diasHastaDomingo = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const diaFin = Math.min(totalDias, diaActual + diasHastaDomingo);

    semanas.push({
      numero: numeroSemana,
      label: `Semana ${numeroSemana} (${diaActual}/${mes + 1} - ${diaFin}/${mes + 1})`,
      inicioKey: toKey(año, mes, diaActual),
      finKey: toKey(año, mes, diaFin),
      diaInicio: diaActual,
      diaFin: diaFin,
    });

    diaActual = diaFin + 1;
    numeroSemana++;
  }

  return semanas;
}

const formVacio = { actividad: "", otraActividad: "", observaciones: "" };

function Entrenamientos() {
  const hoy = new Date();

  const [año, setAño]                 = useState(hoy.getFullYear());
  const [mes, setMes]                 = useState(hoy.getMonth());
  const [entrenamientos, setEntrenamientos] = useState({});
  const [diaModal, setDiaModal]       = useState(null);
  const [form, setForm]               = useState(formVacio);
  const [error, setError]             = useState(false);
  const [mostrarPlan, setMostrarPlan] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [tabResumen, setTabResumen]   = useState("mensual");
  const [semanaIndex, setSemanaIndex] = useState(0);

  const retroceder = () => {
    if (mes === 0) { setMes(11); setAño((a) => a - 1); }
    else setMes((m) => m - 1);
  };

  const avanzar = () => {
    if (mes === 11) { setMes(0); setAño((a) => a + 1); }
    else setMes((m) => m + 1);
  };

  const cargar = async () => {
    try {
      const res = await fetch(URL_ENTRENAMIENTOS);
      const data = await res.json();
      const agrupados = {};
      (Array.isArray(data) ? data : []).forEach((item) => {
        const fechaKey = item.fecha;
        (agrupados[fechaKey] ??= []).push(item);
      });
      setEntrenamientos(agrupados);
    } catch {
      setEntrenamientos({});
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirDia = (dia) => {
    setDiaModal(dia);
    setForm(formVacio);
    setError(false);
  };

  const handleActividadChange = (e) => {
    const actSel = e.target.value;
    setForm((f) => ({ ...f, actividad: actSel, otraActividad: "" }));
    setError(false);
  };

  const agregarEntrenamiento = async () => {
    if (!form.actividad) {
      setError(true);
      return;
    }

    let actividadFinal = form.actividad;
    if (form.actividad === "Otra") {
      if (!form.otraActividad.trim()) {
        setError(true);
        return;
      }
      actividadFinal = form.otraActividad.trim();
    }

    const key = toKey(año, mes, diaModal);
    try {
      const res = await fetch(URL_ENTRENAMIENTOS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: key,
          actividad: actividadFinal,
          grupo: actividadFinal,
          observaciones: form.observaciones || ""
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Error en respuesta del servidor");
      }
      const nuevo = await res.json();

      setEntrenamientos((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), nuevo] }));
      setForm(formVacio);
      setError(false);
      setDiaModal(null);
      Swal.fire({ icon: "success", title: "Entrenamiento registrado", timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("Error al guardar:", err);
      setError(true);
      Swal.fire({ icon: "error", title: "Error", text: err.message || "No se pudo guardar el entrenamiento" });
    }
  };

  const eliminarEntrenamiento = async (key, idx) => {
    const item = (entrenamientos[key] ?? [])[idx];
    if (!item?._id) return;
    const result = await Swal.fire({
      title: "¿Eliminar entrenamiento?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#7a4040",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`${URL_ENTRENAMIENTOS}/${item._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setEntrenamientos((prev) => {
        const lista = [...(prev[key] ?? [])];
        lista.splice(idx, 1);
        return { ...prev, [key]: lista };
      });
      await Swal.fire({ icon: "success", title: "Entrenamiento eliminado", timer: 1200, showConfirmButton: false });
      setDiaModal(null);
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo eliminar el entrenamiento" });
    }
  };

  const dias           = celdasMes(año, mes);
  const hoyKey         = toKey(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const keyModal       = diaModal ? toKey(año, mes, diaModal) : null;
  const modalList      = keyModal ? (entrenamientos[keyModal] ?? []) : [];

  // Calcular cantidad de entrenamientos por actividad en el mes seleccionado
  const counts = {};
  ACTIVIDADES.forEach((a) => {
    counts[a.label] = 0;
  });

  const targetPrefix = `${año}-${String(mes + 1).padStart(2, "0")}-`;
  Object.entries(entrenamientos).forEach(([key, list]) => {
    if (key.startsWith(targetPrefix)) {
      list.forEach((v) => {
        const nombreAct = v.actividad || v.grupo || "Otra";
        if (counts[nombreAct] !== undefined) {
          counts[nombreAct]++;
        } else {
          counts[nombreAct] = 1;
        }
      });
    }
  });

  // Calcular semanas del mes seleccionado y filtrar según semanaIndex
  const semanasDelMes = getSemanasDelMes(año, mes);
  const semanaSeleccionada = semanasDelMes[semanaIndex] || semanasDelMes[0];

  const countsSemanalFiltro = {};
  ACTIVIDADES.forEach((a) => { countsSemanalFiltro[a.label] = 0; });

  if (semanaSeleccionada) {
    Object.entries(entrenamientos).forEach(([key, list]) => {
      if (key >= semanaSeleccionada.inicioKey && key <= semanaSeleccionada.finKey) {
        list.forEach((v) => {
          const nombreAct = v.actividad || v.grupo || "Otra";
          if (countsSemanalFiltro[nombreAct] !== undefined) {
            countsSemanalFiltro[nombreAct]++;
          } else {
            countsSemanalFiltro[nombreAct] = 1;
          }
        });
      }
    });
  }

  const exportarExcelResumen = async () => {
    try {
      const nombreMes = MESES_NOMBRE[mes];
      const titulo = `Resumen de Entrenamientos - ${nombreMes} ${año}`;
      const fechaHoy = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
      const columnas = ["Actividad", "Cantidad de Entrenamientos"];
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Entrenamientos");

      ws.mergeCells(1, 1, 1, 2);
      const celdaTitulo = ws.getCell("A1");
      celdaTitulo.value = titulo;
      celdaTitulo.font = { bold: true, size: 14, color: { argb: "FF000000" } };
      celdaTitulo.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 24;

      ws.mergeCells(2, 1, 2, 2);
      const celdaFecha = ws.getCell("A2");
      celdaFecha.value = `Fecha: ${fechaHoy}`;
      celdaFecha.font = { italic: true, size: 10, color: { argb: "FF555555" } };
      celdaFecha.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(2).height = 18;

      ws.addRow([]);

      const filaEncabezado = ws.addRow(columnas);
      filaEncabezado.height = 22;
      filaEncabezado.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FF000000" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      const listaActidadesFinal = [
        ...ACTIVIDADES.map((a) => a.label),
        ...Object.keys(counts).filter((k) => !ACTIVIDADES.some((a) => a.label === k))
      ];

      listaActidadesFinal.forEach((actLabel) => {
        const count = counts[actLabel] || 0;
        const row = ws.addRow([actLabel, count]);
        row.height = 20;
        row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      });

      const totalVal = Object.values(counts).reduce((a, b) => a + b, 0);
      const rowTotal = ws.addRow(["Total", totalVal]);
      rowTotal.height = 22;
      rowTotal.eachCell((cell) => {
        cell.font = { bold: true };
      });
      rowTotal.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
      rowTotal.getCell(2).alignment = { horizontal: "center", vertical: "middle" };

      ws.getColumn(1).width = 30;
      ws.getColumn(2).width = 25;

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Resumen_Entrenamientos_${nombreMes}_${año}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo exportar a Excel" });
    }
  };

  const añosDisponibles = [...new Set([
    hoy.getFullYear() - 2,
    hoy.getFullYear() - 1,
    hoy.getFullYear(),
    hoy.getFullYear() + 1,
    hoy.getFullYear() + 2,
    ...Object.keys(entrenamientos).map((k) => Number(k.split("-")[0]))
  ])].filter(Boolean).sort((a, b) => a - b);

  const getModalTitle = () => {
    if (!diaModal) return "";
    const dateObj = new Date(año, mes, diaModal);
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const nombreDia = diasSemana[dateObj.getDay()];
    return `${nombreDia}, ${diaModal} de ${MESES_NOMBRE[mes]} de ${año}`;
  };

  return (
    <Container className={isMobile ? "py-2 px-2" : "py-4"}>

      {/* Navegación mes */}
      <div className={`d-flex align-items-center justify-content-center ${isMobile ? "gap-2 mb-3" : "gap-3 mb-4"}`}>
        <button onClick={retroceder} style={estiloNavBtn}>
          <i className="bi bi-chevron-left"></i>
        </button>
        <div className="d-flex gap-2 align-items-center justify-content-center" style={{ minWidth: isMobile ? "150px" : "250px" }}>
          <Form.Select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            style={{
              fontSize: isMobile ? "0.9rem" : "1.1rem",
              fontWeight: "bold",
              color: "#333",
              border: "1.5px solid #bbb",
              borderRadius: "6px",
              padding: isMobile ? "4px 8px" : "6px 12px",
              width: isMobile ? "115px" : "140px",
              cursor: "pointer",
              backgroundColor: "#fff"
            }}
            size="sm"
          >
            {MESES_NOMBRE.map((mNombre, idx) => (
              <option key={idx} value={idx}>
                {mNombre}
              </option>
            ))}
          </Form.Select>
          <Form.Select
            value={año}
            onChange={(e) => setAño(Number(e.target.value))}
            style={{
              fontSize: isMobile ? "0.9rem" : "1.1rem",
              fontWeight: "bold",
              color: "#333",
              border: "1.5px solid #bbb",
              borderRadius: "6px",
              padding: isMobile ? "4px 8px" : "6px 12px",
              width: isMobile ? "85px" : "100px",
              cursor: "pointer",
              backgroundColor: "#fff"
            }}
            size="sm"
          >
            {añosDisponibles.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Form.Select>
        </div>
        <button onClick={avanzar} style={estiloNavBtn}>
          <i className="bi bi-chevron-right"></i>
        </button>
      </div>

      {/* Calendario */}
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>

        {/* Encabezados Días */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: isMobile ? "2px" : "4px", marginBottom: isMobile ? "2px" : "4px" }}>
          {DIAS.map((d) => (
            <div
              key={d}
              style={{
                textAlign: "center",
                fontWeight: "700",
                fontSize: isMobile ? "0.68rem" : "0.82rem",
                color: "#666",
                padding: isMobile ? "2px 0" : "6px 0",
                letterSpacing: "0.5px"
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Celdas del Mes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: isMobile ? "2px" : "4px" }}>
          {dias.map((dia, idx) => {
            if (!dia) return <div key={`v-${idx}`} />;
            const key    = toKey(año, mes, dia);
            const vDia   = entrenamientos[key] ?? [];
            const esHoy  = key === hoyKey;

            const bgCell = esHoy ? "#eef6f6" : "#fff";
            const hoverBgCell = esHoy ? "#dbebeb" : "#f0f6f6";
            const colorText = esHoy ? COLOR : "#333";

            return (
              <div
                key={key}
                onClick={() => abrirDia(dia)}
                style={{
                  border: esHoy ? `2px solid ${COLOR}` : "1.5px solid #ddd",
                  borderRadius: isMobile ? "6px" : "8px",
                  padding: isMobile ? "4px 3px" : "8px 6px",
                  height: isMobile ? "70px" : "105px",
                  cursor: "pointer",
                  backgroundColor: bgCell,
                  transition: "background-color 0.15s",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  overflow: "hidden"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBgCell)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = bgCell)}
              >
                <div style={{ fontWeight: esHoy ? "bold" : "normal", fontSize: isMobile ? "0.75rem" : "0.88rem", color: colorText, marginBottom: isMobile ? "1px" : "3px", textAlign: "center", flexShrink: 0 }}>
                  {dia}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden", flexGrow: 1 }}>
                  {vDia.slice(0, 2).map((v, i) => {
                    const actNombre = v.actividad || v.grupo;
                    return (
                      <div
                        key={i}
                        style={{
                          color: colorActividad(actNombre),
                          fontWeight: "600",
                          textAlign: "center",
                          padding: "0 1px",
                          fontSize: isMobile ? "0.62rem" : "0.72rem",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          lineHeight: "1.15",
                          maxHeight: isMobile ? "28px" : "36px",
                          overflow: "hidden"
                        }}
                      >
                        {actNombre}
                      </div>
                    );
                  })}
                  {vDia.length > 2 && (
                    <div style={{ fontSize: isMobile ? "0.58rem" : "0.68rem", color: "#888", textAlign: "center", flexShrink: 0, marginTop: "auto" }}>
                      +{vDia.length - 2} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botones Inferiores */}
      <div style={{ maxWidth: "860px", margin: "1.5rem auto 0", display: "flex", justifyContent: "center", alignItems: "center", gap: "12px" }}>
        <Button
          onClick={() => setMostrarPlan(true)}
          style={{
            backgroundColor: "transparent",
            borderColor: COLOR,
            color: COLOR,
            fontWeight: "bold",
            padding: isMobile ? "8px 16px" : "10px 20px",
            fontSize: isMobile ? "0.9rem" : "1rem",
            flex: 1,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = COLOR;
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = COLOR;
          }}
        >
          <i className="bi bi-journal-text me-2"></i>Plan
        </Button>
        <Button
          onClick={() => setMostrarResumen(true)}
          style={{
            backgroundColor: "transparent",
            borderColor: "#2b6cb0",
            color: "#2b6cb0",
            fontWeight: "bold",
            padding: isMobile ? "8px 16px" : "10px 20px",
            fontSize: isMobile ? "0.9rem" : "1rem",
            flex: 1,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#2b6cb0";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#2b6cb0";
          }}
        >
          <i className="bi bi-bar-chart-fill me-2"></i>Resumen
        </Button>
      </div>

      {/* Modal de Plan */}
      <Modal show={mostrarPlan} onHide={() => setMostrarPlan(false)} size="lg" centered contentClassName="border border-dark">
        <Modal.Header closeButton style={{ backgroundColor: "#3a7070", color: "#fff" }}>
          <Modal.Title className="fw-bold" style={{ fontSize: isMobile ? "1.1rem" : "1.25rem" }}>
            <i className="bi bi-calendar4-week me-2"></i>Plan de Entrenamientos
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className={isMobile ? "p-2" : "p-4"} style={{ backgroundColor: "#fdfdfd" }}>
          <div className="table-responsive">
            <table className="table table-bordered align-middle text-center" style={{ width: "100%", borderRadius: "8px", overflow: "hidden", borderCollapse: "collapse", margin: "0" }}>
              <thead>
                <tr style={{ backgroundColor: "transparent", color: "#3a7070" }}>
                  <th style={{ padding: isMobile ? "8px 4px" : "12px", border: "1.5px solid #bbb", fontWeight: "700", fontSize: isMobile ? "0.82rem" : "0.95rem", width: "30%" }}>Día</th>
                  <th style={{ padding: isMobile ? "8px 4px" : "12px", border: "1.5px solid #bbb", fontWeight: "700", fontSize: isMobile ? "0.82rem" : "0.95rem", width: "35%" }}>Mañana</th>
                  <th style={{ padding: isMobile ? "8px 4px" : "12px", border: "1.5px solid #bbb", fontWeight: "700", fontSize: isMobile ? "0.82rem" : "0.95rem", width: "35%" }}>Tarde</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { dia: "Lunes", manana: "Pileta", tarde: "" },
                  { dia: "Martes", manana: "Gimnasio", tarde: "Bicicleta" },
                  { dia: "Miércoles", manana: "Pileta", tarde: "" },
                  { dia: "Jueves", manana: "Gimnasio", tarde: "Pileta" },
                  { dia: "Viernes", manana: "Pileta", tarde: "" },
                  { dia: "Sábado", manana: "Bicicleta", tarde: "" },
                  { dia: "Domingo", manana: "Descanso", tarde: "Descanso" },
                ].map((item, idx) => (
                  <tr key={idx} style={{ backgroundColor: "transparent" }}>
                    <td className="fw-bold" style={{ padding: isMobile ? "8px 4px" : "12px", border: "1px solid #ccc", color: "#333", fontSize: isMobile ? "0.8rem" : "0.95rem" }}>
                      {item.dia}
                    </td>
                    <td style={{ padding: isMobile ? "8px 4px" : "12px", border: "1px solid #ccc", color: "#000", fontWeight: "600", fontSize: isMobile ? "0.8rem" : "0.92rem" }}>
                      {item.manana || <span className="text-muted fw-normal">—</span>}
                    </td>
                    <td style={{ padding: isMobile ? "8px 4px" : "12px", border: "1px solid #ccc", color: "#000", fontWeight: "600", fontSize: isMobile ? "0.8rem" : "0.92rem" }}>
                      {item.tarde || <span className="text-muted fw-normal">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button size="sm" variant="secondary" onClick={() => setMostrarPlan(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Resumen Mensual y Semanal */}
      <Modal show={mostrarResumen} onHide={() => setMostrarResumen(false)} size="lg" centered contentClassName="border border-dark">
        <Modal.Header closeButton style={{ backgroundColor: "#3a7070", color: "#fff" }}>
          <Modal.Title className="fw-bold" style={{ fontSize: isMobile ? "1.1rem" : "1.25rem" }}>
            <i className="bi bi-bar-chart-fill me-2"></i>Resumen
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className={isMobile ? "p-2" : "p-4"} style={{ backgroundColor: "#fdfdfd" }}>
          
          {/* Solapas Mensual / Semanal */}
          <div className="d-flex justify-content-center mb-3">
            <Nav variant="tabs" activeKey={tabResumen} onSelect={(k) => setTabResumen(k)} style={{ borderBottom: "2px solid #3a7070" }}>
              <Nav.Item>
                <Nav.Link eventKey="mensual" style={{ fontWeight: "bold", fontSize: "0.92rem", color: tabResumen === "mensual" ? "#3a7070" : "#555" }}>
                  <i className="bi bi-calendar-month me-1"></i>Mensual
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="semanal" style={{ fontWeight: "bold", fontSize: "0.92rem", color: tabResumen === "semanal" ? "#3a7070" : "#555" }}>
                  <i className="bi bi-calendar-week me-1"></i>Semanal
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </div>

          {tabResumen === "mensual" && (
            <>
              <div className="d-flex align-items-center justify-content-center position-relative mb-3">
                <div className="d-flex gap-2">
                  <Form.Select
                    value={mes}
                    onChange={(e) => setMes(Number(e.target.value))}
                    style={{ maxWidth: "150px", borderColor: COLOR, color: COLOR, fontWeight: "bold", cursor: "pointer" }}
                    size="sm"
                  >
                    {MESES_NOMBRE.map((nombre, idx) => (
                      <option key={idx} value={idx}>{nombre}</option>
                    ))}
                  </Form.Select>
                  <Form.Select
                    value={año}
                    onChange={(e) => setAño(Number(e.target.value))}
                    style={{ maxWidth: "100px", borderColor: COLOR, color: COLOR, fontWeight: "bold", cursor: "pointer" }}
                    size="sm"
                  >
                    {añosDisponibles.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </Form.Select>
                </div>
                <Button
                  variant="outline-success"
                  size="sm"
                  className="fw-bold border-0 p-1 px-2 text-success position-absolute end-0"
                  style={{ backgroundColor: "transparent" }}
                  onClick={exportarExcelResumen}
                  title="Descargar Excel"
                >
                  <i className="bi bi-file-earmark-excel-fill me-1 fs-6"></i>Excel
                </Button>
              </div>

              <div className="table-responsive">
                <table className="table table-bordered align-middle text-center" style={{ width: "100%", borderRadius: "8px", overflow: "hidden", borderCollapse: "separate", borderSpacing: "0", margin: "0" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#3a7070", color: "#fff" }}>
                      <th style={{ padding: isMobile ? "6px 4px" : "12px", border: "1px solid #2e5959", fontWeight: "700", fontSize: isMobile ? "0.78rem" : "0.95rem" }}>Actividad</th>
                      <th style={{ padding: isMobile ? "6px 4px" : "12px", border: "1px solid #2e5959", fontWeight: "700", fontSize: isMobile ? "0.78rem" : "0.95rem" }}>Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const listaActividadesFinal = [
                        ...ACTIVIDADES.map((a) => a.label),
                        ...Object.keys(counts).filter((k) => !ACTIVIDADES.some((a) => a.label === k))
                      ];
                      return listaActividadesFinal.map((actLabel, idx) => {
                        const count = counts[actLabel] || 0;
                        return (
                          <tr key={actLabel} style={{ backgroundColor: idx % 2 === 0 ? "#f9fbfb" : "#ffffff" }}>
                            <td style={{ padding: isMobile ? "6px 4px" : "12px", border: "1px solid #dee2e6", textAlign: "left", paddingLeft: isMobile ? "10px" : "20px" }}>
                              <span className="fw-semibold" style={{ fontSize: isMobile ? "0.82rem" : "0.95rem", color: "#000" }}>{actLabel}</span>
                            </td>
                            <td className="fw-bold" style={{ padding: isMobile ? "6px 4px" : "12px", border: "1px solid #dee2e6", color: count > 0 ? COLOR : "#888", fontSize: isMobile ? "0.85rem" : "1rem" }}>
                              {count}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                    <tr style={{ backgroundColor: "#eaeaea" }}>
                      <td style={{ padding: isMobile ? "6px 4px" : "12px", border: "1px solid #ccc", textAlign: "left", paddingLeft: isMobile ? "10px" : "20px" }} className="fw-bold">
                        Total Mensual
                      </td>
                      <td className="fw-bold" style={{ padding: isMobile ? "6px 4px" : "12px", border: "1px solid #ccc", fontSize: isMobile ? "0.85rem" : "1rem", color: COLOR }}>
                        {Object.values(counts).reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tabResumen === "semanal" && (
            <>
              <div className="d-flex flex-column align-items-center justify-content-center position-relative mb-3 gap-2">
                <div className="d-flex gap-2">
                  <Form.Select
                    value={mes}
                    onChange={(e) => {
                      setMes(Number(e.target.value));
                      setSemanaIndex(0);
                    }}
                    style={{ maxWidth: "140px", borderColor: COLOR, color: COLOR, fontWeight: "bold", cursor: "pointer" }}
                    size="sm"
                  >
                    {MESES_NOMBRE.map((nombre, idx) => (
                      <option key={idx} value={idx}>{nombre}</option>
                    ))}
                  </Form.Select>
                  <Form.Select
                    value={año}
                    onChange={(e) => {
                      setAño(Number(e.target.value));
                      setSemanaIndex(0);
                    }}
                    style={{ maxWidth: "90px", borderColor: COLOR, color: COLOR, fontWeight: "bold", cursor: "pointer" }}
                    size="sm"
                  >
                    {añosDisponibles.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </Form.Select>
                </div>
                
                <div className="d-flex gap-2 align-items-center">
                  <Form.Select
                    value={semanaIndex}
                    onChange={(e) => setSemanaIndex(Number(e.target.value))}
                    style={{ minWidth: "220px", borderColor: COLOR, color: COLOR, fontWeight: "bold", cursor: "pointer" }}
                    size="sm"
                  >
                    {semanasDelMes.map((s, idx) => (
                      <option key={idx} value={idx}>{s.label}</option>
                    ))}
                  </Form.Select>

                  <Button
                    variant="outline-success"
                    size="sm"
                    className="fw-bold border-0 p-1 px-2 text-success"
                    style={{ backgroundColor: "transparent" }}
                    onClick={exportarExcelResumen}
                    title="Descargar Excel"
                  >
                    <i className="bi bi-file-earmark-excel-fill me-1 fs-6"></i>Excel
                  </Button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-bordered align-middle text-center" style={{ width: "100%", borderRadius: "8px", overflow: "hidden", borderCollapse: "separate", borderSpacing: "0", margin: "0" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#3a7070", color: "#fff" }}>
                      <th style={{ padding: isMobile ? "6px 4px" : "12px", border: "1px solid #2e5959", fontWeight: "700", fontSize: isMobile ? "0.78rem" : "0.95rem" }}>Actividad</th>
                      <th style={{ padding: isMobile ? "6px 4px" : "12px", border: "1px solid #2e5959", fontWeight: "700", fontSize: isMobile ? "0.78rem" : "0.95rem" }}>Cantidad en la Semana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const listaActividadesFinal = [
                        ...ACTIVIDADES.map((a) => a.label),
                        ...Object.keys(countsSemanalFiltro).filter((k) => !ACTIVIDADES.some((a) => a.label === k))
                      ];
                      return listaActividadesFinal.map((actLabel, idx) => {
                        const count = countsSemanalFiltro[actLabel] || 0;
                        return (
                          <tr key={actLabel} style={{ backgroundColor: idx % 2 === 0 ? "#f9fbfb" : "#ffffff" }}>
                            <td style={{ padding: isMobile ? "6px 4px" : "12px", border: "1px solid #dee2e6", textAlign: "left", paddingLeft: isMobile ? "10px" : "20px" }}>
                              <span className="fw-semibold" style={{ fontSize: isMobile ? "0.82rem" : "0.95rem", color: "#000" }}>{actLabel}</span>
                            </td>
                            <td className="fw-bold" style={{ padding: isMobile ? "6px 4px" : "12px", border: "1px solid #dee2e6", color: count > 0 ? COLOR : "#888", fontSize: isMobile ? "0.85rem" : "1rem" }}>
                              {count}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                    <tr style={{ backgroundColor: "#eaeaea" }}>
                      <td style={{ padding: isMobile ? "6px 4px" : "12px", border: "1px solid #ccc", textAlign: "left", paddingLeft: isMobile ? "10px" : "20px" }} className="fw-bold">
                        Total Semanal
                      </td>
                      <td className="fw-bold" style={{ padding: isMobile ? "6px 4px" : "12px", border: "1px solid #ccc", fontSize: isMobile ? "0.85rem" : "1rem", color: COLOR }}>
                        {Object.values(countsSemanalFiltro).reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button size="sm" variant="secondary" onClick={() => setMostrarResumen(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Agregar/Editar Entrenamiento */}
      <Modal show={diaModal !== null} onHide={() => setDiaModal(null)} centered contentClassName="border border-dark">
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold w-100 text-center" style={{ fontSize: "1.1rem" }}>
            {getModalTitle()}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center px-4">

          {/* Entrenamientos ya registrados */}
          {modalList.length > 0 && (
            <div className="mb-3">
              <p className="fw-semibold mb-2 text-center small text-uppercase text-muted" style={{ letterSpacing: "0.5px" }}>Entrenamientos del día:</p>
              {modalList.map((item, i) => {
                const actNombre = item.actividad || item.grupo;
                return (
                  <div
                    key={i}
                    style={{
                      borderLeft: `4px solid ${colorActividad(actNombre)}`,
                      backgroundColor: "#f8f9fa",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      marginBottom: "6px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div className="d-flex flex-column gap-1 text-start">
                      <strong style={{ color: colorActividad(actNombre), fontSize: "0.9rem" }}>{actNombre}</strong>
                      {item.observaciones && (
                        <span className="text-muted ms-1" style={{ fontSize: "0.82rem" }}>
                          {item.observaciones}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => eliminarEntrenamiento(keyModal, i)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#8b4a4a", padding: "4px 6px" }}
                      title="Eliminar entrenamiento"
                    >
                      <i className="bi bi-trash fs-6"></i>
                    </button>
                  </div>
                );
              })}
              <div style={{ height: "1px", backgroundColor: "#e0e0e0", margin: "10px 0 0" }} />
            </div>
          )}

          {/* Formulario */}
          <p className="fw-semibold mb-3 text-center small text-secondary">
            {modalList.length > 0 ? "Agregar otro entrenamiento:" : "Nuevo entrenamiento:"}
          </p>

          <Form.Group className="mb-3 d-flex flex-column align-items-center">
            <Form.Label className="fw-semibold text-center small mb-1">Actividad *</Form.Label>
            <Form.Select
              size="sm"
              value={form.actividad}
              onChange={handleActividadChange}
              isInvalid={error && !form.actividad}
              autoFocus
              style={{
                maxWidth: "260px",
                textAlign: "center",
                textAlignLast: "center",
                fontSize: "0.88rem",
                borderRadius: "6px"
              }}
            >
              <option value="">— Seleccionar Actividad —</option>
              {ACTIVIDADES.map((a) => (
                <option key={a.label} value={a.label}>{a.label}</option>
              ))}
            </Form.Select>
            {error && !form.actividad && <Form.Control.Feedback type="invalid" className="small text-center">Seleccioná una actividad</Form.Control.Feedback>}
          </Form.Group>

          {form.actividad === "Otra" && (
            <Form.Group className="mb-3 d-flex flex-column align-items-center">
              <Form.Label className="fw-semibold text-center small mb-1">Nombre de la Actividad *</Form.Label>
              <Form.Control
                size="sm"
                type="text"
                placeholder="Especificar actividad..."
                value={form.otraActividad || ""}
                onChange={(e) => {
                  setForm((f) => ({ ...f, otraActividad: e.target.value }));
                  setError(false);
                }}
                isInvalid={error && !form.otraActividad.trim()}
                autoFocus
                style={{
                  maxWidth: "260px",
                  textAlign: "center",
                  fontSize: "0.88rem",
                  borderRadius: "6px"
                }}
              />
              {error && !form.otraActividad.trim() && (
                <Form.Control.Feedback type="invalid" className="small text-center">Especificá la actividad</Form.Control.Feedback>
              )}
            </Form.Group>
          )}

          <Form.Group className="mb-2 d-flex flex-column align-items-center">
            <Form.Label className="fw-semibold text-center small mb-1">Observaciones</Form.Label>
            <Form.Control
              size="sm"
              type="text"
              placeholder="Observaciones..."
              value={form.observaciones}
              onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && agregarEntrenamiento()}
              style={{
                maxWidth: "260px",
                textAlign: "center",
                fontSize: "0.88rem",
                borderRadius: "6px"
              }}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="justify-content-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setDiaModal(null)} style={{ padding: "4px 16px" }}>Cerrar</Button>
          <Button size="sm" onClick={agregarEntrenamiento} style={{ backgroundColor: COLOR, border: "none", color: "#fff", padding: "4px 16px" }}>
            <i className="bi bi-save me-1"></i>Guardar
          </Button>
        </Modal.Footer>
      </Modal>

    </Container>
  );
}

const estiloNavBtn = {
  background: "none",
  border: "1.5px solid #bbb",
  borderRadius: "6px",
  padding: "6px 14px",
  fontSize: "1rem",
  cursor: "pointer",
  transition: "background-color 0.15s",
};

export default Entrenamientos;
