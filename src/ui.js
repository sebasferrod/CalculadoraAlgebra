const panelTarjetas = document.querySelector(".almacen-vectores");

// ── Tarjetas ──

function crearTarjeta(id, titulo, contenido, extra = "") {
  // Si ya existe, la actualiza
  eliminarTarjeta(id);

  const tarjeta = document.createElement("div");
  tarjeta.className = "tarjeta";
  tarjeta.dataset.id = id;

  tarjeta.innerHTML = `
    <div class="tarjeta-header">${titulo}</div>
    <div class="tarjeta-body">${contenido}</div>
    ${extra ? `<div class="tarjeta-extra">${extra}</div>` : ""}
  `;

  panelTarjetas.appendChild(tarjeta);
}

function crearTarjetaVector(nombre, vector) {
  const contenido = `
    <div class="tarjeta-valores">${vector.toString()}</div>
    <div class="tarjeta-modulo">|${nombre}| = ${vector.modulo().toFixed(4)}</div>
  `;
  eliminarTarjeta(nombre); // limpia tarjeta de operación previa con el mismo nombre
  crearTarjeta(`vec_${nombre}`, nombre, contenido, "Vector");
}

function crearTarjetaOperacion(tipo, id, valores, modulo, operandos, expr) {
  let titulo;
  let contenido;
  let extra = expr || "";

  switch (tipo) {
    case "vector":
      titulo = id;
      contenido = `
        <div class="tarjeta-valores">${valores}</div>
        <div class="tarjeta-modulo">Módulo: ${modulo.toFixed(4)}</div>
      `;
      extra = expr ? `${expr}` : extra;
      break;

    case "modulo":
      titulo = `|${operandos[0]}|`;
      contenido = `
        <div class="tarjeta-valores">${valores}</div>
        <div class="tarjeta-modulo">|${operandos[0]}| = ${modulo.toFixed(4)}</div>
      `;
      break;

    case "angulo":
      titulo = `∠ ${id}`;
      contenido = `
        <div class="tarjeta-valores tarjeta-angulo">${modulo}</div>
        <div class="tarjeta-modulo">${valores}</div>
        <div class="tarjeta-padres">Padres: ${operandos[0]}, ${operandos[1]}</div>
      `;
      break;

    default:
      titulo = id;
      contenido = `<div class="tarjeta-valores">${valores}</div>`;
  }

  eliminarTarjeta(`vec_${id}`); // limpia tarjeta de definición previa con el mismo nombre
  crearTarjeta(id, titulo, contenido, extra);
}

function eliminarTarjeta(id) {
  const existente = panelTarjetas.querySelector(`.tarjeta[data-id="${id}"]`);
  if (existente) existente.remove();
}

// ── Errores visibles ──

let toastTimeout;

function mostrarError(mensaje) {
  // Eliminar toast anterior si existe
  const anterior = document.querySelector(".toast-error");
  if (anterior) anterior.remove();
  if (toastTimeout) clearTimeout(toastTimeout);

  const toast = document.createElement("div");
  toast.className = "toast-error";
  toast.textContent = `⚠ ${mensaje}`;
  document.body.appendChild(toast);

  // Auto-dismiss después de 4 segundos
  toastTimeout = setTimeout(() => {
    toast.remove();
  }, 4000);

  // Click para cerrar antes
  toast.addEventListener("click", () => {
    toast.remove();
    if (toastTimeout) clearTimeout(toastTimeout);
  });
}

export { crearTarjetaVector, crearTarjetaOperacion, eliminarTarjeta, mostrarError };
