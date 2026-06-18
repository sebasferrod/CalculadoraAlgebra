class Vector{
    constructor(dimensiones, valores = Array(dimensiones).fill(0)){
        this.x = new Array(dimensiones);
        for (let i = 0; i < dimensiones; i++){
            // Redondeo a 8 decimales para evitar errores de precisión.
            this.x[i] = this.#redondeoPresicion(valores[i]);
        }
    }

    modulo(){
        let suma_cuadrados = 0;
        for (let i = 0; i < this.x.length; i++){
            suma_cuadrados += this.x[i]**2;
        }
        return this.#redondeoPresicion(Math.sqrt(suma_cuadrados));
    }

    getDimensiones(){
        return this.x.length;
    }

    productoEscalar(escalar){
        let v_esc = new Array(this.getDimensiones());
        for (let i = 0; i < this.getDimensiones(); i++){
            v_esc[i] = this.x[i] * escalar;
        }
        // Acaso aqui se crea un vector nuevo innecesariamente?
        let v = new Vector(this.getDimensiones(), v_esc);
        return v;
    }

    proyeccion(v){
        if (this.getDimensiones() !== v.getDimensiones()){
            throw new Error("Los vectores deben tener la misma dimension");
        }
        else{
            let p = 0;
            let d = this.modulo()**2;
            let resultado_escalar = 0;
            for (let i = 0; i < this.getDimensiones(); i++){
                p += this.x[i] * v.x[i]; //Producto punto entre los vectores
            }
            try{
                if (d === 0){
                    throw new Error("El vector no puede ser el vector nulo");
                }
            }
            catch (error){
                console.error(error.message);
                return null;
            }
            resultado_escalar = p / d;
                // Redondeo resultado_escalar a 8 decimales para evitar problemas de precisión.
                resultado_escalar = this.#redondeoPresicion(resultado_escalar);
            return this.productoEscalar(resultado_escalar) // Se multiplica el vector director por el escalar obtenido al dividir el producto punto entre la magnitud al cuadrado del vector director.
        }
    }

    #redondeoPresicion(numero) {
    return Math.round((numero + Number.EPSILON) * 100000000) / 100000000;
}

    toString(){
        return `(${ this.x.toString() })`;
    }
}

export default Vector;