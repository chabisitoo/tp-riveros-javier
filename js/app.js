// ============================================================
// Explorador de ubicaciones · Trabajo Práctico
// Fundamentos de Desarrollo Web · Variante B · Javier Riveros
// API: https://rickandmortyapi.com/documentation
// ============================================================

// ---------- 1. Configuración ----------
const URL_UBICACIONES = "https://rickandmortyapi.com/api/location";
const CLAVE_ALMACENAMIENTO = "tp-ubicaciones:ultima-busqueda";
const TEXTO_DESCONOCIDO = "Desconocido";

// ---------- 2. Elementos del DOM ----------
const formularioBusqueda = document.querySelector("#formulario-busqueda");
const campoNombre = document.querySelector("#campo-nombre");
const campoTipo = document.querySelector("#campo-tipo");
const botonBuscar = document.querySelector("#boton-buscar");
const mensajeEstado = document.querySelector("#mensaje-estado");
const contadorResultados = document.querySelector("#contador-resultados");
const contenedorResultados = document.querySelector("#contenedor-resultados");

// ---------- 3. Criterios de búsqueda ----------
// Quita espacios de los extremos y colapsa los dobles internos
const limpiarTexto = (valor) => valor.trim().replace(/\s+/g, " ");

const leerCriterios = () => ({
  nombre: limpiarTexto(campoNombre.value),
  tipo: limpiarTexto(campoTipo.value),
});

const hayCriterios = (criterios) => criterios.nombre !== "" || criterios.tipo !== "";

const completarFormulario = (criterios) => {
  campoNombre.value = criterios.nombre;
  campoTipo.value = criterios.tipo;
};

// ---------- 4. Persistencia en localStorage ----------
const guardarBusqueda = (criterios) => {
  try {
    localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(criterios));
  } catch (error) {
    console.warn("No se pudo guardar la búsqueda:", error);
  }
};

// Devuelve { nombre, tipo } o null si no hay nada guardado (o el dato es inválido)
const leerBusquedaGuardada = () => {
  try {
    const texto = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (texto === null) {
      return null;
    }
    const datos = JSON.parse(texto);
    return {
      nombre: typeof datos.nombre === "string" ? datos.nombre : "",
      tipo: typeof datos.tipo === "string" ? datos.tipo : "",
    };
  } catch (error) {
    console.warn("No se pudo leer la búsqueda guardada:", error);
    return null;
  }
};

// ---------- 5. Acceso a la API (no toca el DOM) ----------
// Arma la URL con new URL() y searchParams; solo agrega los parámetros con valor
const construirUrl = (criterios) => {
  const url = new URL(URL_UBICACIONES);
  if (criterios.nombre !== "") {
    url.searchParams.set("name", criterios.nombre);
  }
  if (criterios.tipo !== "") {
    url.searchParams.set("type", criterios.tipo);
  }
  return url;
};

// Devuelve { total, ubicaciones }
const buscarUbicaciones = async (criterios) => {
  const respuesta = await fetch(construirUrl(criterios));

  // La API responde 404 cuando no hay coincidencias: son cero resultados, no un error
  if (respuesta.status === 404) {
    return { total: 0, ubicaciones: [] };
  }

  if (!respuesta.ok) {
    throw new Error(`El servidor respondió con el código ${respuesta.status}`);
  }

  const datos = await respuesta.json();
  return {
    total: datos.info?.count ?? 0,
    ubicaciones: datos.results ?? [],
  };
};

// ---------- 6. Formateo ----------
// Valores vacíos, nulos o "unknown" se muestran como «Desconocido»
const textoSeguro = (valor) => {
  if (!valor || valor.toLowerCase() === "unknown") {
    return TEXTO_DESCONOCIDO;
  }
  return valor;
};

const textoResidentes = (cantidad) => (cantidad === 1 ? "1 residente" : `${cantidad} residentes`);

const textoContador = (total, mostrados) => {
  if (total === 1) {
    return "1 ubicación encontrada";
  }
  if (total === mostrados) {
    return `${total} ubicaciones encontradas`;
  }
  return `${total} ubicaciones encontradas · se muestran las primeras ${mostrados}`;
};

// ---------- 7. Renderizado (createElement + textContent) ----------
const crearDato = (etiqueta, valor) => {
  const termino = document.createElement("dt");
  termino.textContent = etiqueta;
  const descripcion = document.createElement("dd");
  descripcion.textContent = valor;
  return [termino, descripcion];
};

const crearTarjeta = (ubicacion) => {
  const tarjeta = document.createElement("article");
  tarjeta.classList.add("tarjeta");

  const titulo = document.createElement("h2");
  titulo.textContent = textoSeguro(ubicacion.name);

  const etiquetaTipo = document.createElement("span");
  etiquetaTipo.classList.add("etiqueta-tipo");
  etiquetaTipo.textContent = textoSeguro(ubicacion.type);

  const listaDatos = document.createElement("dl");
  listaDatos.append(
    ...crearDato("Tipo", textoSeguro(ubicacion.type)),
    ...crearDato("Dimensión", textoSeguro(ubicacion.dimension)),
    ...crearDato("Residentes", textoResidentes(ubicacion.residents?.length ?? 0))
  );

  tarjeta.append(titulo, etiquetaTipo, listaDatos);
  return tarjeta;
};

const limpiarResultados = () => {
  contenedorResultados.replaceChildren();
};

const mostrarUbicaciones = (ubicaciones) => {
  contenedorResultados.replaceChildren(...ubicaciones.map(crearTarjeta));
};

const mostrarContador = (total, mostrados) => {
  contadorResultados.textContent = textoContador(total, mostrados);
  contadorResultados.hidden = false;
};

const ocultarContador = () => {
  contadorResultados.textContent = "";
  contadorResultados.hidden = true;
};

// ---------- 8. Estados de la interfaz ----------
const mostrarMensaje = (texto, esError = false) => {
  mensajeEstado.textContent = texto;
  mensajeEstado.classList.toggle("error", esError);
};

const activarCarga = (estaCargando) => {
  botonBuscar.disabled = estaCargando;
  botonBuscar.textContent = estaCargando ? "Buscando…" : "Buscar";
  contenedorResultados.setAttribute("aria-busy", String(estaCargando));
};

const describirError = (error) =>
  error instanceof TypeError
    ? "No se pudo conectar con la API. Revisa tu conexión a internet e inténtalo de nuevo."
    : `Ocurrió un problema al consultar la API (${error.message}).`;

// ---------- 9. Búsqueda ----------
// Ejecuta la búsqueda completa: carga, petición, tarjetas y mensajes
const realizarBusqueda = async (criterios) => {
  activarCarga(true);
  mostrarMensaje("Buscando…");
  ocultarContador();
  limpiarResultados();

  try {
    const { total, ubicaciones } = await buscarUbicaciones(criterios);

    if (ubicaciones.length === 0) {
      mostrarMensaje("Sin resultados: no hay ubicaciones con esos criterios. Prueba con otros valores.");
      return;
    }

    mostrarUbicaciones(ubicaciones);
    mostrarContador(total, ubicaciones.length);
    mostrarMensaje("");
  } catch (error) {
    console.warn("Error al buscar ubicaciones:", error);
    mostrarMensaje(describirError(error), true);
  } finally {
    activarCarga(false);
  }
};

// ---------- 10. Manejadores ----------
const manejarEnvio = (evento) => {
  evento.preventDefault();
  const criterios = leerCriterios();

  if (!hayCriterios(criterios)) {
    mostrarMensaje("Escribe al menos un criterio (nombre o tipo) para buscar.", true);
    ocultarContador();
    limpiarResultados();
    campoNombre.focus();
    return;
  }

  completarFormulario(criterios); // muestra los valores ya limpios
  guardarBusqueda(criterios);
  realizarBusqueda(criterios);
};

// Al abrir la página: si hay una búsqueda guardada, se restaura y se repite
const restaurarUltimaBusqueda = () => {
  const criterios = leerBusquedaGuardada();
  if (criterios === null || !hayCriterios(criterios)) {
    return;
  }
  completarFormulario(criterios);
  realizarBusqueda(criterios);
};

// ---------- 11. Inicio ----------
formularioBusqueda.addEventListener("submit", manejarEnvio);
restaurarUltimaBusqueda();
