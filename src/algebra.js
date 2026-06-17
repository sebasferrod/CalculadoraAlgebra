import Vector from "./vector.js";

// Operaciones con vectores
// Suma dos vectores:
function sumaVectores(v1, v2){
    let v = new Vector(v1.getDimensiones());
    if (v1.getDimensiones() !== v2.getDimensiones()){
        throw new Error("Los vectores deben tener la misma dimension");
    }
    else if (v1.getDimensiones() === v2.getDimensiones()){
        for (let i = 0; i < v1.getDimensiones(); i++){
            v.x[i] = v1.x[i] + v2.x[i];
        }
    }
    return v;
}

// Resta dos vectores:
function restaVectores(v1, v2){
    let v = sumaVectores(v1, escalarVector(v2, -1));
    return v;
}

// Vector por escalar:
function escalarVector(v, escalar){
    let v_esc = new Vector(v.getDimensiones());
    for (let i = 0; i < v.getDimensiones(); i++){
        v_esc.x[i] = v.x[i] * escalar;
    }
    return v_esc;
}

// Producto punto:
function productoPunto(v1, v2){
    if (v1.getDimensiones() !== v2.getDimensiones()){
        throw new Error("Los vectores deben tener la misma dimension");
    }
    else if (v1.getDimensiones() === v2.getDimensiones()){
        let p = 0;
        for (let i = 0; i < v1.getDimensiones(); i++){
            p += v1.x[i] * v2.x[i];
        }
        return p;
    }
}

// Angulo entre dos vectores:
function anguloVectores(v1, v2){
    let cos_theta = productoPunto(v1, v2) / (v1.modulo() * v2.modulo());
    let theta = Math.acos(cos_theta);
    return theta;
}

function productoVectorial(v1, v2){
    if (v1.getDimensiones() !== 3 || v2.getDimensiones() !== 3){
        throw new Error("El producto vectorial solo esta definido para vectores en R**3");
    }
    let v_prod = new Array(3);
    v_prod[0] = v1.x[1]*v2.x[2] - v1.x[2]*v2.x[1];
    v_prod[1] = v1.x[2]*v2.x[0] - v1.x[0]*v2.x[2];
    v_prod[2] = v1.x[0]*v2.x[1] - v1.x[1]*v2.x[0];
    return new Vector(3, v_prod);
}

function piRadianes(angulo_en_radianes){
    let pi_radianes = angulo_en_radianes / Math.PI;
    return redondeoPresicion(pi_radianes);
}

function grados(angulo_en_radianes){
    let _grados = angulo_en_radianes * 180 / Math.PI;
    return redondeoPresicion(_grados);
}

function redondeoPresicion(numero) {
    return Math.round((numero + Number.EPSILON) * 100000000 / 100000000);
}

// Vectores para probar angulo entre vectores:
let v1 = new Vector(2, [2, 1]);
let v2 = new Vector(2, [-2, -1]);
// Vectores para probar la proyeccion:
let v3 = new Vector(2, [4, 1]); // Director para proyectar sobre el.
let v4 = new Vector(2, [1.88, -1.12]); // Proyectado sobre v3
// Vectores para probar el producto vectorial:
let v5 = new Vector(3, [1,3,-4]);
let v6 = new Vector(3, [1,1,1]); // Vector para probar el producto punto:
// Vector para probar el modulo y toString:
let v7 = new Vector(2, [0.71,0.71]);
// Vector para probar el producto punto:
let v8 = new Vector(3, [1,3,-4]);
console.log("---");
// v4 proyectado sobre v3:
console.log(`Proyeccion de v4 ${v4} sobre v3 ${v3}: ${v3.proyeccion(v4)}\n---`);

// Angulo entre v1 y v2:
console.log("El angulo entre los vectores es: ");
console.log(anguloVectores(v1, v2));
console.log(`Pi radianes:\t${piRadianes(anguloVectores(v1, v2))}`);
console.log(`Grados:\t\t${grados(anguloVectores(v1, v2))}\n---`);

// Producto vectorial entre v6 y v5:
console.log("Producto vectorial entre v6 y v5:");
console.log(productoVectorial(v5, v6));

// Modulo de v7 y toString de v7:
console.log("Modulo de v7:");
console.log(v7.modulo());
console.log(v7.toString());

// Producto punto entre v6 y v8:
console.log("Producto punto entre v6 y v8:");
console.log(productoPunto(v6, v8));

// Diferencia entre v4 y v3:
console.log(`v3:\t${v3.toString()}\nv4:\t${v4.toString()}`)
console.log("Diferencia entre v4 y v3:");
let resultado = restaVectores(v4, v3);
console.log(resultado.toString());
console.log("Modulo de la diferencia:");
console.log(resultado.modulo());

export {sumaVectores, restaVectores, escalarVector, productoPunto, anguloVectores};