import Vector from "./vector.js";

// Operaciones con vectores
// Suma dos vectores:
function sumaVectores(v1, v2){
    if (v1.getDimensiones() !== v2.getDimensiones()){
        throw new Error("Los vectores deben tener la misma dimension");
    }
    const dim = v1.getDimensiones();
    const valores = new Array(dim);
    for (let i = 0; i < dim; i++){
        valores[i] = v1.x[i] + v2.x[i];
    }
    return new Vector(dim, valores);
}

// Resta dos vectores:
function restaVectores(v1, v2){
    let v = sumaVectores(v1, escalarVector(v2, -1));
    return v;
}

// Vector por escalar:
function escalarVector(v, escalar){
    const dim = v.getDimensiones();
    const valores = new Array(dim);
    for (let i = 0; i < dim; i++){
        valores[i] = v.x[i] * escalar;
    }
    return new Vector(dim, valores);
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
    return Math.round((numero + Number.EPSILON) * 100000000) / 100000000;
}



export {sumaVectores, restaVectores, escalarVector, productoPunto, productoVectorial, anguloVectores};