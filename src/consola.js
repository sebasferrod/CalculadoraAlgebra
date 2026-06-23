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
// Almacén de escalares: nombre -> número
const escalares = new Map();
// Metadatos para recrear tarjetas: nombre -> { tarjeta, expr, ops }
const metas = new Map();

// ── Persistencia con localStorage ──
const STORAGE_KEY = "calculadora-vectores";

function guardarEstado() {
  const datos = [];
  for (const [nombre, v] of vectores) {
    const meta = metas.get(nombre) || {};
    datos.push({ n: nombre, v: [...v.x], d: v.getDimensiones(), t: "v", c: meta.tarjeta || "def", e: meta.expr || "", o: meta.ops || [] });
  }
  for (const [nombre, val] of escalares) {
    const meta = metas.get(nombre) || {};
    datos.push({ n: nombre, v: [val], d: 1, t: "e", c: meta.tarjeta || "escalar", e: meta.expr || "", o: meta.ops || [] });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
}

function cargarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const datos = JSON.parse(raw);
    for (const item of datos) {
      if (item.t === "e") {
        escalares.set(item.n, item.v[0]);
        metas.set(item.n, { tarjeta: item.c, expr: item.e, ops: item.o });
        if (item.c === "punto") {
          crearTarjetaOperacion("punto", item.n, item.e, item.v[0], item.o, "");
        } else if (item.c === "modulo") {
          crearTarjetaOperacion("modulo", item.n, `(${item.o[0]})`, item.v[0], item.o, item.e);
        } else {
          crearTarjetaOperacion("escalar", item.n, item.e, item.v[0], item.o, "");
        }
      } else {
        const v = new Vector(item.d, item.v);
        vectores.set(item.n, v);
        metas.set(item.n, { tarjeta: item.c, expr: item.e, ops: item.o });
        if (item.c === "def" || item.c === "escvec") {
          crearTarjetaVector(item.n, v);
        } else {
          crearTarjetaOperacion("vector", item.n, `(${v.x.join(", ")})`, v.modulo(), item.o, item.e);
        }
      }
    }
  } catch (e) {
    console.warn("No se pudo restaurar el estado guardado:", e.message);
    localStorage.removeItem(STORAGE_KEY);
  }
}

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

  // Renombrar: nombre: nuevo_nombre
  const matchRenombrar = entrada.match(/^([a-zA-Z_]\w*)\s*:\s*([a-zA-Z_]\w*)$/);
  if (matchRenombrar) return { tipo: "comando", cmd: "renombrar", nombre: matchRenombrar[1], nuevo: matchRenombrar[2] };

  // Error si faltó el nuevo nombre: nombre:
  const matchRenSin = entrada.match(/^([a-zA-Z_]\w*)\s*:\s*$/);
  if (matchRenSin) return { tipo: "error", msg: "No se especificó nuevo nombre." };

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
  const matchPunto = entrada.match(/^([a-zA-Z_]\w*|-?\d+\.?\d*)\s*\.\s*([a-zA-Z_]\w*|-?\d+\.?\d*)$/);
  if (matchPunto) {
    return { tipo: "operacion", op: "punto", a: matchPunto[1], b: matchPunto[2] };
  }

  // Producto vectorial: a x b
  const matchCruz = entrada.match(/^([a-zA-Z_]\w*|-?\d+\.?\d*)\s*x\s+([a-zA-Z_]\w*|-?\d+\.?\d*)$/);
  if (matchCruz) {
    return { tipo: "operacion", op: "vectorial", a: matchCruz[1], b: matchCruz[2] };
  }

  // Suma: a + b
  const matchSuma = entrada.match(/^([a-zA-Z_]\w*|-?\d+\.?\d*)\s*\+\s*([a-zA-Z_]\w*|-?\d+\.?\d*)$/);
  if (matchSuma) {
    return { tipo: "operacion", op: "suma", a: matchSuma[1], b: matchSuma[2] };
  }

  // Resta: a - b
  const matchResta = entrada.match(/^([a-zA-Z_]\w*|-?\d+\.?\d*)\s*-\s*([a-zA-Z_]\w*|-?\d+\.?\d*)$/);
  if (matchResta) {
    return { tipo: "operacion", op: "resta", a: matchResta[1], b: matchResta[2] };
  }

  // Producto escalar: a * n o n * a
  const matchEscalar = entrada.match(/^([a-zA-Z_]\w*|-?\d+\.?\d*)\s*\*\s*([a-zA-Z_]\w*|-?\d+\.?\d*)$/);
  if (matchEscalar) {
    return { tipo: "operacion", op: "escalar", a: matchEscalar[1], b: matchEscalar[2] };
  }

  // División escalar: a / b
  const matchDiv = entrada.match(/^([a-zA-Z_]\w*|-?\d+\.?\d*)\s*\/\s*([a-zA-Z_]\w*|-?\d+\.?\d*)$/);
  if (matchDiv) {
    return { tipo: "operacion", op: "division", a: matchDiv[1], b: matchDiv[2] };
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
      case "renombrar":
        return renombrarElemento(parsed.nombre, parsed.nuevo);
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
    guardarEstado();
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
        case "division": return ejecutarBinaria(parsed, "division");
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
  try {
    const v = obtenerVector(token);
    return { tipo: "vector", valor: v };
  } catch (e) {
    // ¿Es un escalar guardado?
    if (escalares.has(token)) {
      return { tipo: "numero", valor: escalares.get(token) };
    }
    throw e;
  }
}

// Sanitiza tokens para nombres: reemplaza "-" por "neg" y "." por "p" en números
function nom(token) {
  if (!isNaN(parseFloat(token))) {
    return token.replace("-", "neg").replace(".", "p");
  }
  return token;
}

function ejecutarBinaria(parsed, op) {
  const a = resolverOperando(parsed.a);
  const b = resolverOperando(parsed.b);

  if (a.tipo === "error") throw new Error(a.msg);
  if (b.tipo === "error") throw new Error(b.msg);

  const expr = `${parsed.a} ${simboloOp(op)} ${parsed.b}`;

  // ── Operaciones escalar-escalar ──
  if (a.tipo === "numero" && b.tipo === "numero") {
    let resultado;
    let nombreOp;
    switch (op) {
      case "suma":     resultado = a.valor + b.valor; nombreOp = "suma"; break;
      case "resta":    resultado = a.valor - b.valor; nombreOp = "resta"; break;
      case "escalar":  resultado = a.valor * b.valor; nombreOp = "mult"; break;
      case "division": resultado = a.valor / b.valor; nombreOp = "div"; break;
      case "punto":    throw new Error("El producto punto solo se hace entre vectores.");
      case "vectorial":throw new Error("El producto vectorial solo se hace entre vectores en R³.");
      default:         throw new Error("Operación no válida entre escalares.");
    }
    const nombreResultado = `${nombreOp}_${nom(parsed.a)}_${nom(parsed.b)}`;
    return { tipo: "escalar", nombre: nombreResultado, valor: resultado, expr, operandos: [parsed.a, parsed.b], tarjeta: "escalar", escalarNota: "operación escalar" };
  }

  // ── Operaciones vector-vector ──
  let resultado;
  let nombreResultado;

  switch (op) {
    case "suma":
      if (a.tipo !== "vector" || b.tipo !== "vector") throw new Error("La suma requiere dos vectores, o dos escalares. No se pueden mezclar.");
      resultado = sumaVectores(a.valor, b.valor);
      nombreResultado = `suma_${parsed.a}_${parsed.b}`;
      return { tipo: "vector", nombre: nombreResultado, vector: resultado, expr, operandos: [parsed.a, parsed.b], vectorialNota: "operación vectorial" };
    case "resta":
      if (a.tipo !== "vector" || b.tipo !== "vector") throw new Error("La resta requiere dos vectores, o dos escalares. No se pueden mezclar.");
      resultado = restaVectores(a.valor, b.valor);
      nombreResultado = `resta_${parsed.a}_${parsed.b}`;
      return { tipo: "vector", nombre: nombreResultado, vector: resultado, expr, operandos: [parsed.a, parsed.b], vectorialNota: "operación vectorial" };
    case "punto":
      if (a.tipo !== "vector" || b.tipo !== "vector") throw new Error("El producto punto solo se hace entre vectores.");
      resultado = productoPunto(a.valor, b.valor);
      nombreResultado = `punto_${parsed.a}_${parsed.b}`;
      return { tipo: "escalar", nombre: nombreResultado, valor: resultado, expr, operandos: [parsed.a, parsed.b] };
    case "vectorial":
      if (a.tipo !== "vector" || b.tipo !== "vector") throw new Error("El producto vectorial solo se hace entre vectores en R³.");
      resultado = productoVectorial(a.valor, b.valor);
      nombreResultado = `cruz_${parsed.a}_${parsed.b}`;
      return { tipo: "vector", nombre: nombreResultado, vector: resultado, expr, operandos: [parsed.a, parsed.b], vectorialNota: "operación vectorial" };
    case "escalar":
      throw new Error("El producto escalar requiere un vector y un número. Usá la forma 'vector * número'.");
    case "division":
      throw new Error("La división solo está definida entre escalares.");
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
    const nombreResultado = `${nom(parsed.a)}_${nom(parsed.b)}x`;
    return { tipo: "vector", nombre: nombreResultado, vector: resultado, expr: `${parsed.a} * ${parsed.b}`, soloTarjeta: true };
  }
  if (a.tipo === "numero" && b.tipo === "vector") {
    const resultado = escalarVector(b.valor, a.valor);
    const nombreResultado = `${nom(parsed.b)}_${nom(parsed.a)}x`;
    return { tipo: "vector", nombre: nombreResultado, vector: resultado, expr: `${parsed.a} * ${parsed.b}`, soloTarjeta: true };
  }
  if (a.tipo === "numero" && b.tipo === "numero") {
    const resultado = a.valor * b.valor;
    const nombreResultado = `mult_${nom(parsed.a)}_${nom(parsed.b)}`;
    return { tipo: "escalar", nombre: nombreResultado, valor: resultado, expr: `${parsed.a} * ${parsed.b}`, operandos: [parsed.a, parsed.b], tarjeta: "escalar", escalarNota: "operación escalar" };
  }
  throw new Error("El producto escalar requiere un vector y un número, o dos escalares.");
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
  if (vectores.size === 0 && escalares.size === 0) return { tipo: "info", msg: "No hay vectores ni escalares cargados." };
  const lista = [];
  for (const [nombre, v] of vectores) {
    lista.push(`${nombre} = ${v.toString()} | módulo: ${v.modulo().toFixed(4)}`);
  }
  for (const [nombre, val] of escalares) {
    lista.push(`${nombre} = ${val.toFixed(4)}  (escalar)`);
  }
  return { tipo: "info", msg: lista.join("\n") };
}

function borrarVector(nombre) {
  if (vectores.has(nombre)) {
    vectores.delete(nombre);
    metas.delete(nombre);
    // Borrar escalares derivados de este vector (mod_nombre)
    for (const key of escalares.keys()) {
      if (key === `mod_${nombre}`) { escalares.delete(key); metas.delete(key); }
    }
    guardarEstado();
    eliminarTarjeta(nombre);
    eliminarTarjeta(`vec_${nombre}`);
    return { tipo: "info", msg: `Vector "${nombre}" eliminado.` };
  }
  if (escalares.has(nombre)) {
    escalares.delete(nombre);
    metas.delete(nombre);
    guardarEstado();
    eliminarTarjeta(nombre);
    eliminarTarjeta(`vec_${nombre}`);
    return { tipo: "info", msg: `Escalar "${nombre}" eliminado.` };
  }
  return { tipo: "error", msg: `"${nombre}" no existe.` };
}

function renombrarElemento(viejo, nuevo) {
  // Buscar en vectores
  if (vectores.has(viejo)) {
    const v = vectores.get(viejo);
    const meta = metas.get(viejo) || {};
    vectores.delete(viejo);
    metas.delete(viejo);
    vectores.set(nuevo, v);
    metas.set(nuevo, meta);
    guardarEstado();
    eliminarTarjeta(viejo);
    eliminarTarjeta(`vec_${viejo}`);
    // Recrear tarjeta con nuevo nombre
    if (meta.tarjeta === "def" || meta.tarjeta === "escvec") {
      crearTarjetaVector(nuevo, v);
    } else {
      crearTarjetaOperacion("vector", nuevo, `(${v.x.join(", ")})`, v.modulo(), meta.ops, meta.expr);
    }
    return { tipo: "info", msg: `Vector "${viejo}" renombrado a "${nuevo}".` };
  }
  // Buscar en escalares
  if (escalares.has(viejo)) {
    const val = escalares.get(viejo);
    const meta = metas.get(viejo) || {};
    escalares.delete(viejo);
    metas.delete(viejo);
    escalares.set(nuevo, val);
    metas.set(nuevo, meta);
    guardarEstado();
    eliminarTarjeta(viejo);
    eliminarTarjeta(`vec_${viejo}`);
    crearTarjetaOperacion(meta.tarjeta || "escalar", nuevo, meta.expr, val, meta.ops, "");
    return { tipo: "info", msg: `Escalar "${viejo}" renombrado a "${nuevo}".` };
  }
  return { tipo: "error", msg: `"${viejo}" no existe.` };
}

function simboloOp(op) {
  const map = { suma: "+", resta: "-", punto: ".", vectorial: "x", escalar: "*", division: "/" };
  return map[op] || op;
}

// ── Interfaz de consola ──

let outputEl, inputEl;

// Historial de comandos
const historial = [];
let posHistorial = -1;

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
  const entradaOriginal = inputEl.value;
  if (!entradaOriginal.trim()) return;

  log(`> ${entradaOriginal}`, "comando-usuario");
  inputEl.value = "";

  // Guardar en historial
  historial.push(entradaOriginal);
  if (historial.length > 100) historial.shift();
  posHistorial = historial.length;

  // ── Resolver paréntesis de adentro hacia afuera ──
  let entrada = entradaOriginal.trim();

  // Saltar pre-procesador si es una definición de vector: $nombre(...)
  if (/^\$[a-zA-Z_]\w*\(.+\)$/.test(entrada)) {
    const parsed = parse(entrada);
    const resultado = ejecutar(parsed);
    if (resultado) manejarResultado(resultado);
    return;
  }

  let maxIter = 10; // protección contra bucles infinitos
  while (entrada.includes("(") && maxIter-- > 0) {
    const match = entrada.match(/\(([^()]+)\)/); // paréntesis más internos
    if (!match) break;
    const interno = match[1].trim();
    let reemplazo;

    // ¿Es un número literal (incluyendo negativo)?
    if (/^-?\d+\.?\d*$/.test(interno)) {
      reemplazo = interno;
    } else {
      // Intentar parsear y ejecutar como expresión
      const parsed = parse(interno);
      const resultado = ejecutar(parsed);
      if (resultado && resultado.tipo === "error") {
        log(`  (error en paréntesis: ${resultado.msg})`, "error");
        return;
      }
      if (resultado && resultado.tipo === "escalar") {
        reemplazo = String(resultado.valor);
      } else if (resultado && resultado.tipo === "vector") {
        // Guardar temporalmente para poder referenciarlo
        vectores.set(resultado.nombre, resultado.vector);
        metas.set(resultado.nombre, { tarjeta: "vector", expr: interno, ops: [] });
        guardarEstado();
        reemplazo = resultado.nombre;
      } else if (resultado && resultado.tipo === "modulo") {
        escalares.set(resultado.nombre, resultado.valor);
        metas.set(resultado.nombre, { tarjeta: "modulo", expr: resultado.expr, ops: [resultado.nombreVector] });
        guardarEstado();
        reemplazo = String(resultado.valor);
      } else {
        // No se pudo resolver, dejar como está
        break;
      }
    }
    entrada = entrada.replace(match[0], reemplazo);
  }

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
        metas.set(r.nombre, { tarjeta: "vector", expr: r.expr, ops: r.operandos });
        guardarEstado();
        log(`  → guardado como "${r.nombre}"`, "info");
        crearTarjetaOperacion("vector", r.nombre, `(${r.vector.x.join(", ")})`, mod, r.operandos, r.expr);
      } else if (r.soloTarjeta) {
        vectores.set(r.nombre, r.vector);
        metas.set(r.nombre, { tarjeta: "escvec", expr: r.expr, ops: [] });
        guardarEstado();
        log(`  → guardado como "${r.nombre}"`, "info");
        crearTarjetaVector(r.nombre, r.vector);
      } else if (!r.expr || r.sobreescrito) {
        metas.set(r.nombre, { tarjeta: "def", expr: "", ops: [] });
        crearTarjetaVector(r.nombre, r.vector);
      }
      break;
    }

    case "escalar": {
      const nota = r.escalarNota ? ` (${r.escalarNota})` : "";
      log(`${r.expr} = ${r.valor.toFixed(4)}${nota}`, "resultado");
      if (r.operandos) {
        escalares.set(r.nombre, r.valor);
        metas.set(r.nombre, { tarjeta: r.tarjeta || "punto", expr: r.expr, ops: r.operandos });
        guardarEstado();
        log(`  → guardado como "${r.nombre}"`, "info");
        crearTarjetaOperacion(r.tarjeta || "punto", r.nombre, r.expr, r.valor, r.operandos, "");
      }
      break;
    }

    case "modulo": {
      log(`${r.expr} = ${r.valor.toFixed(4)}`, "resultado");
      log(`  → guardado como "${r.nombre}"`, "info");
      escalares.set(r.nombre, r.valor);
      metas.set(r.nombre, { tarjeta: "modulo", expr: r.expr, ops: [r.nombreVector] });
      guardarEstado();
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
    "$nombre(valores)  Definir vector       $v1(1,2,3)",
    "a + b / n + m     Suma (vect. o esc.)  v1 + v2",
    "a - b / n - m     Resta                v1 - v2",
    "a * n / n * a     Producto escalar     v1 * 3",
    "a . b             Producto punto       v1 . v2",
    "a x b             Prod. vectorial      v1 x v2",
    "a -> b            Proyección (a sobre b)",
    "n / m             División escalar     10 / 3",
    "|a|               Módulo              |v1|",
    "angulo a b        Ángulo entre vectores",
    "listar            Listar vectores cargados",
    "borrar nombre     Eliminar un vector",
    "nombre: nuevo     Renombrar elemento",
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

  // Restaurar vectores guardados de la sesión anterior
  cargarEstado();

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      procesarEntrada();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (posHistorial > 0) {
        posHistorial--;
        inputEl.value = historial[posHistorial];
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (posHistorial < historial.length - 1) {
        posHistorial++;
        inputEl.value = historial[posHistorial];
      } else {
        posHistorial = historial.length;
        inputEl.value = "";
      }
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
