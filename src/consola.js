import Vector from "./vector.js";
import {
  sumaVectores,
  restaVectores,
  escalarVector,
  productoPunto,
  productoVectorial,
  anguloVectores,
} from "./algebra.js";
import { crearTarjetaVector, crearTarjetaOperacion, eliminarTarjeta, mostrarError } from "./ui.js";

// Almacén de vectores: nombre -> Vector
const vectores = new Map();

// Contador para letras griegas en ángulos
const letrasGriegas = ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ"];
let contadorAngulos = 0;

function parse(input) {
  const entrada = input.trim();
  if (!entrada) return null;

  // Comandos de administración
  if (entrada === "listar") return { tipo: "comando", cmd: "listar" };
  if (entrada === "limpiar") return { tipo: "comando", cmd: "limpiar" };
  if (entrada === "ayuda")  return { tipo: "comando", cmd: "ayuda" };
  
  const matchBorrar = entrada.match(/^borrar\s+([a-zA-Z_]\w*)$/);
  if (matchBorrar) return { tipo: "comando", cmd: "borrar", nombre: matchBorrar[1] };

  // Definición de vector: $nombre(valores)
  const matchDef = entrada.match(/^\$([a-zA-Z_]\w*)\(([^)]+)\)$/);
  if (matchDef) {
    const nombre = matchDef[1];
    const partes = matchDef[2].split(",").map(s => parseFloat(s.trim()));
    if (partes.some(isNaN)) return { tipo: "error", msg: "Valores inválidos. Usá números separados por coma." };
    return { tipo: "definicion", nombre, valores: partes };
  }

  // Prefijo: angulo a b
  const matchAngulo = entrada.match(/^angulo\s+([a-zA-Z_]\w*)\s+([a-zA-Z_]\w*)$/);
  if (matchAngulo) {
    return { tipo: "operacion", op: "angulo", a: matchAngulo[1], b: matchAngulo[2] };
  }

  // Módulo: |a|
  const matchModulo = entrada.match(/^\|([a-zA-Z_]\w*)\|$/);
  if (matchModulo) {
    return { tipo: "operacion", op: "modulo", a: matchModulo[1] };
  }

  // Operaciones infijas
  // Flecha: a -> b
  const matchFlecha = entrada.match(/^([a-zA-Z_]\w*)\s*->\s*([a-zA-Z_]\w*)$/);
  if (matchFlecha) {
    return { tipo: "operacion", op: "proyeccion", a: matchFlecha[1], b: matchFlecha[2] };
  }

  // Producto punto: a . b
  const matchPunto = entrada.match(/^([a-zA-Z_]\w*|\d+\.?\d*)\s*\.\s*([a-zA-Z_]\w*|\d+\.?\d*)$/);
  if (matchPunto) {
    return { tipo: "operacion", op: "punto", a: matchPunto[1], b: matchPunto[2] };
  }

  // Producto vectorial: a x b
  const matchCruz = entrada.match(/^([a-zA-Z_]\w*|\d+\.?\d*)\s*x\s+([a-zA-Z_]\w*|\d+\.?\d*)$/);
  if (matchCruz) {
    return { tipo: "operacion", op: "vectorial", a: matchCruz[1], b: matchCruz[2] };
  }

  // Suma: a + b
  const matchSuma = entrada.match(/^([a-zA-Z_]\w*|\d+\.?\d*)\s*\+\s*([a-zA-Z_]\w*|\d+\.?\d*)$/);
  if (matchSuma) {
    return { tipo: "operacion", op: "suma", a: matchSuma[1], b: matchSuma[2] };
  }

  // Resta: a - b
  const matchResta = entrada.match(/^([a-zA-Z_]\w*|\d+\.?\d*)\s*-\s*([a-zA-Z_]\w*|\d+\.?\d*)$/);
  if (matchResta) {
    return { tipo: "operacion", op: "resta", a: matchResta[1], b: matchResta[2] };
  }

  // Producto escalar: a * n o n * a
  const matchEscalar = entrada.match(/^([a-zA-Z_]\w*|\d+\.?\d*)\s*\*\s*([a-zA-Z_]\w*|\d+\.?\d*)$/);
  if (matchEscalar) {
    return { tipo: "operacion", op: "escalar", a: matchEscalar[1], b: matchEscalar[2] };
  }

  return { tipo: "error", msg: "Comando no reconocido. Escribí 'ayuda' para ver los comandos disponibles." };
}

function obtenerVector(nombre) {
  if (!isNaN(parseFloat(nombre))) return null; // es un número, no un vector
  const v = vectores.get(nombre);
  if (!v) throw new Error(`El vector "${nombre}" no existe.`);
  return v;
}

function ejecutar(parsed) {
  if (!parsed) return null;
  if (parsed.tipo === "error") return { tipo: "error", msg: parsed.msg };

  // Comandos
  if (parsed.tipo === "comando") {
    switch (parsed.cmd) {
      case "listar":
        return listarVectores();
      case "borrar":
        return borrarVector(parsed.nombre);
      case "limpiar":
        return { tipo: "limpiar" };
      case "ayuda":
        return { tipo: "ayuda" };
    }
  }

  // Definición de vector
  if (parsed.tipo === "definicion") {
    if (parsed.valores.length === 0) {
      return { tipo: "error", msg: "El vector debe tener al menos un valor." };
    }
    const existe = vectores.has(parsed.nombre);
    const v = new Vector(parsed.valores.length, parsed.valores);
    vectores.set(parsed.nombre, v);
    return { tipo: "vector", nombre: parsed.nombre, vector: v, sobreescrito: existe };
  }

  // Operaciones
  if (parsed.tipo === "operacion") {
    try {
      switch (parsed.op) {
        case "suma": return ejecutarBinaria(parsed, "suma");
        case "resta": return ejecutarBinaria(parsed, "resta");
        case "punto": return ejecutarBinaria(parsed, "punto");
        case "vectorial": return ejecutarBinaria(parsed, "vectorial");
        case "proyeccion": return ejecutarProyeccion(parsed);
        case "escalar": return ejecutarEscalar(parsed);
        case "modulo": return ejecutarModulo(parsed);
        case "angulo": return ejecutarAngulo(parsed);
        default: return { tipo: "error", msg: "Operación no implementada." };
      }
    } catch (e) {
      return { tipo: "error", msg: e.message };
    }
  }

  return { tipo: "error", msg: "No se pudo interpretar el comando." };
}

function resolverOperando(token) {
  const num = parseFloat(token);
  if (!isNaN(num)) return { tipo: "numero", valor: num };
  const v = obtenerVector(token);
  return { tipo: "vector", valor: v };
}

function ejecutarBinaria(parsed, op) {
  const a = resolverOperando(parsed.a);
  const b = resolverOperando(parsed.b);

  if (a.tipo === "error") throw new Error(a.msg);
  if (b.tipo === "error") throw new Error(b.msg);

  let resultado;
  let nombreResultado;
  const expr = `${parsed.a} ${simboloOp(op)} ${parsed.b}`;

  switch (op) {
    case "suma":
      if (a.tipo !== "vector" || b.tipo !== "vector") throw new Error("La suma solo se puede hacer entre vectores.");
      resultado = sumaVectores(a.valor, b.valor);
      nombreResultado = `suma_${parsed.a}_${parsed.b}`;
      return { tipo: "vector", nombre: nombreResultado, vector: resultado, expr, operandos: [parsed.a, parsed.b] };
    case "resta":
      if (a.tipo !== "vector" || b.tipo !== "vector") throw new Error("La resta solo se puede hacer entre vectores.");
      resultado = restaVectores(a.valor, b.valor);
      nombreResultado = `resta_${parsed.a}_${parsed.b}`;
      return { tipo: "vector", nombre: nombreResultado, vector: resultado, expr, operandos: [parsed.a, parsed.b] };
    case "punto":
      if (a.tipo !== "vector" || b.tipo !== "vector") throw new Error("El producto punto solo se puede hacer entre vectores.");
      resultado = productoPunto(a.valor, b.valor);
      nombreResultado = `punto_${parsed.a}_${parsed.b}`;
      return { tipo: "escalar", nombre: nombreResultado, valor: resultado, expr, operandos: [parsed.a, parsed.b] };
    case "vectorial":
      if (a.tipo !== "vector" || b.tipo !== "vector") throw new Error("El producto vectorial solo se puede hacer entre vectores.");
      resultado = productoVectorial(a.valor, b.valor);
      nombreResultado = `cruz_${parsed.a}_${parsed.b}`;
      return { tipo: "vector", nombre: nombreResultado, vector: resultado, expr, operandos: [parsed.a, parsed.b] };
    default:
      throw new Error("Operación binaria desconocida.");
  }
}

function ejecutarProyeccion(parsed) {
  const a = obtenerVector(parsed.a);
  const b = obtenerVector(parsed.b);
  // a proyectado sobre b: b.proyeccion(a)
  const resultado = b.proyeccion(a);
  if (resultado === null) throw new Error("No se puede proyectar sobre el vector nulo.");
  const nombreResultado = `proy_${parsed.a}_${parsed.b}`;
  return { tipo: "vector", nombre: nombreResultado, vector: resultado, expr: `${parsed.a} -> ${parsed.b}`, operandos: [parsed.a, parsed.b] };
}

function ejecutarEscalar(parsed) {
  const a = resolverOperando(parsed.a);
  const b = resolverOperando(parsed.b);

  if (a.tipo === "vector" && b.tipo === "numero") {
    const resultado = escalarVector(a.valor, b.valor);
    const nombreResultado = `esc_${parsed.a}`;
    return { tipo: "vector", nombre: nombreResultado, vector: resultado, expr: `${parsed.a} * ${parsed.b}`, operandos: [parsed.a, String(parsed.b)] };
  }
  if (a.tipo === "numero" && b.tipo === "vector") {
    const resultado = escalarVector(b.valor, a.valor);
    const nombreResultado = `esc_${parsed.b}`;
    return { tipo: "vector", nombre: nombreResultado, vector: resultado, expr: `${parsed.a} * ${parsed.b}`, operandos: [String(parsed.a), parsed.b] };
  }
  throw new Error("El producto escalar requiere un vector y un número.");
}

function ejecutarModulo(parsed) {
  const v = obtenerVector(parsed.a);
  const resultado = v.modulo();
  const nombreResultado = `mod_${parsed.a}`;
  return { tipo: "modulo", nombre: nombreResultado, valor: resultado, expr: `|${parsed.a}|`, vector: v, nombreVector: parsed.a };
}

function ejecutarAngulo(parsed) {
  const a = obtenerVector(parsed.a);
  const b = obtenerVector(parsed.b);
  const radianes = anguloVectores(a, b);
  const grados = radianes * 180 / Math.PI;
  const letra = letrasGriegas[contadorAngulos % letrasGriegas.length];
  contadorAngulos++;
  const nombreResultado = `ang_${letra}`;
  return {
    tipo: "angulo",
    nombre: nombreResultado,
    letra,
    radianes,
    grados,
    expr: `angulo ${parsed.a} ${parsed.b}`,
    operandos: [parsed.a, parsed.b]
  };
}

function listarVectores() {
  if (vectores.size === 0) return { tipo: "info", msg: "No hay vectores cargados." };
  const lista = [];
  for (const [nombre, v] of vectores) {
    lista.push(`${nombre} = ${v.toString()} | módulo: ${v.modulo().toFixed(4)}`);
  }
  return { tipo: "info", msg: lista.join("\n") };
}

function borrarVector(nombre) {
  if (!vectores.has(nombre)) return { tipo: "error", msg: `El vector "${nombre}" no existe.` };
  vectores.delete(nombre);
  eliminarTarjeta(nombre);
  return { tipo: "info", msg: `Vector "${nombre}" eliminado.` };
}

function simboloOp(op) {
  const map = { suma: "+", resta: "-", punto: ".", vectorial: "x", escalar: "*" };
  return map[op] || op;
}

// ── Interfaz de consola ──

let outputEl, inputEl;

function log(texto, clase = "") {
  const linea = document.createElement("div");
  linea.className = clase;
  linea.textContent = texto;
  outputEl.appendChild(linea);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function logHTML(html) {
  const linea = document.createElement("div");
  linea.innerHTML = html;
  outputEl.appendChild(linea);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function limpiarConsola() {
  outputEl.innerHTML = "";
}

function procesarEntrada() {
  const entrada = inputEl.value;
  if (!entrada.trim()) return;

  log(`> ${entrada}`, "comando-usuario");
  inputEl.value = "";

  const parsed = parse(entrada);
  const resultado = ejecutar(parsed);

  if (!resultado) return;

  manejarResultado(resultado);
}

function manejarResultado(r) {
  switch (r.tipo) {
    case "error":
      log(r.msg, "error");
      mostrarError(r.msg);
      break;

    case "info":
      log(r.msg, "info");
      break;

    case "limpiar":
      limpiarConsola();
      break;

    case "ayuda":
      mostrarAyuda();
      break;

    case "vector": {
      const mod = r.vector.modulo();
      if (r.sobreescrito) {
        log(`Vector "${r.nombre}" sobreescrito — ${r.vector.toString()} | módulo: ${mod.toFixed(4)}`, "aviso");
      } else if (r.expr) {
        log(`${r.expr} = ${r.vector.toString()} | módulo: ${mod.toFixed(4)}`, "resultado");
      } else {
        log(`${r.nombre} = ${r.vector.toString()} | módulo: ${mod.toFixed(4)}`, "resultado");
      }
      if (r.operandos) {
        // Guardar el resultado como vector nombrado para poder citarlo después
        vectores.set(r.nombre, r.vector);
        log(`  → guardado como "${r.nombre}"`, "info");
        crearTarjetaOperacion("vector", r.nombre, `(${r.vector.x.join(", ")})`, mod, r.operandos, r.expr);
      } else {
        crearTarjetaVector(r.nombre, r.vector);
      }
      break;
    }

    case "escalar": {
      log(`${r.expr} = ${r.valor.toFixed(4)}`, "resultado");
      break;
    }

    case "modulo": {
      log(`${r.expr} = ${r.valor.toFixed(4)}`, "resultado");
      crearTarjetaOperacion("modulo", r.nombre, r.vector.toString(), r.valor, [r.nombreVector], r.expr);
      break;
    }

    case "angulo": {
      log(`${r.expr} = ${r.radianes.toFixed(4)} rad | ${r.grados.toFixed(2)}°`, "resultado");
      crearTarjetaOperacion("angulo", r.nombre, `${r.grados.toFixed(2)}°`, `letra: ${r.letra}`, r.operandos, r.expr);
      break;
    }

    default:
      break;
  }
}

function mostrarAyuda() {
  const ayuda = [
    "── COMANDOS ──",
    "$nombre(valores)  Definir vector    $v1(1,2,3)",
    "a + b             Suma              v1 + v2",
    "a - b             Resta             v1 - v2",
    "a * n / n * a     Producto escalar  v1 * 3",
    "a . b             Producto punto    v1 . v2",
    "a x b             Prod. vectorial   v1 x v2",
    "a -> b            Proyección (a sobre b)",
    "|a|               Módulo           |v1|",
    "angulo a b        Ángulo entre vectores",
    "listar            Listar vectores cargados",
    "borrar nombre     Eliminar un vector",
    "limpiar           Limpiar consola",
    "ayuda             Mostrar esta ayuda",
  ];
  for (const linea of ayuda) {
    log(linea, "ayuda");
  }
}

function init() {
  outputEl = document.getElementById("consola-output");
  inputEl = document.getElementById("consola-input");

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      procesarEntrada();
    }
  });

  // Toggle del machete
  const toggle = document.getElementById("machete-toggle");
  const machete = document.getElementById("machete");
  toggle.addEventListener("click", () => {
    machete.classList.toggle("collapsed");
    toggle.textContent = machete.classList.contains("collapsed") ? "▼" : "▲";
    toggle.title = machete.classList.contains("collapsed") ? "Mostrar comandos" : "Ocultar comandos";
  });

  log("Calculadora de Vectores — escribí 'ayuda' para ver los comandos.", "bienvenida");
}

init();

export { init };
