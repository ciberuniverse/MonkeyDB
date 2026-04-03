const fs = require("fs/promises")
const monkey_operators = require("./modules/operators.js")
const monkey_utils = require("./modules/utils.js")

async function read_document(name) {
    let document_read = await fs.readFile(name)
    return JSON.parse(document_read)
}

async function save_document(name, new_document_object) {
    await fs.writeFile(name, JSON.stringify(new_document_object))
}

function document_operators(one_doc, key_find, value_find) {

    // Si se encuentra la coincidencia directa se retorna true
    if (one_doc[key_find] === value_find) {return true}

    // Si no es un objeto el que se envio es porque no contiene operadores por ende es falso
    if (typeof value_find !== 'object') {return false} 

    // Se obtiene la lista de operadores a trabajar
    let operators_list_find = Object.keys(value_find)
    
    // Se verifica si es mas de uno. En caso de serlo se itera por cada operador enviando los resultados a un array
    if (operators_list_find.length > 1) {
        console.log("mas de un filtro")
        
        let result_filter = []
        for (let key_operator of operators_list_find) {

            operator_function_execute = monkey_operators.operators[key_operator]
            if (!operator_function_execute) {
                return false
            }

            result_filter.push(operator_function_execute(one_doc[key_find], value_find[key_operator]))
        }

        // Cuando se termina la iteracion, se verifica que el array contenga todas las respuestas como true.
        return result_filter.every(x => x === true)

    } 

    // Value find es esto: {"$ne": "ola"}
    let operator = operators_list_find[0] // Esto se transforma en $ne
    let operator_value = Object.values(value_find)[0] // Esto se transforma en 'ola'

    let operator_in = monkey_operators.operators[operator] // Operator in obtiene la funcion almacenada en el diccionario

    // Si no existe un operador valido o no existe una funcion asociada, se retorna falso
    if (!operator || !operator_in) {
        console.log(operator, value_find, operator_in)
        return false
    }
    
    // One doc value es el valor del documento tiene para comparar
    let one_doc_value = one_doc[key_find]
    
    // Se pasan los dos parametros a comparar dependiendo del operador
    return operator_in(one_doc_value, operator_value)

}
let iters_with_index = ["delete_many", "delete_one"]
function iter_document_array(object_find, object_project = null, array_document, type_r = "find") {

    let return_doc = []
    let index_list = 0 // Variable que se usara para todo lo que requiera indice de listas

    
    // Se establece el numero de coincidencias desde el objeto a buscar
    let check = Object.values(object_find).length
    


    // Por cada documento encontrado se revisara que cumpla con el filtro enviado
    for (let one_doc of array_document) {
        
        // Contador de coincidencias por usuario
        let passed_check = 0

        // Se setean las variables para usarle dentro del for
        let key, value
        
        for ([key, value] of Object.entries(object_find)) {
            if (document_operators(one_doc, key, value)) {passed_check += 1}
        }

        /* Seccion unicamente para resultados unicos que no requieren mayor iteracion */
        // Se usan else if al ser mas rapidos
        if (type_r === "delete_one" && passed_check === check) {
            console.log(one_doc, index_list)
            return index_list
        }

        // Se retorna la primera coincidencia con la proyeccion si es que se esta pidiendo uno solo
        else if (type_r === "find_one" && passed_check === check) {
            return project(project(one_doc, object_project))
        }

        /* ===================================================================== */

        /* Seccion operacion listado 
        
        Todo lo que esta aqui debajo hasta lo limitado son las operaciones que requieren de una iteracion
        completa del documento. Tales como find, delete_many
        
        */

        // Si se cumple con el filtro se agrega a la lista y se continua
        else if (type_r === "find" && passed_check === check) {
            return_doc.push(project(one_doc, object_project))
            continue
        }

        // Zonas que requieren indices
        else if (type_r === "delete_many" && passed_check === check) {
            return_doc.push(index_list)
        }

        if (iters_with_index.includes(type_r)) {index_list += 1}
        
    }

    // Se retornan todos los documentos en la lista
    return return_doc

}


function project(object_return, object_project = null) {
    
    // Si es que no se trae ninguna proyeccion se retorna el objeto intacto
    if (object_project === null) {return object_return}

    let key, value
    for ([key, value] of Object.entries(object_project)) {

        // Si se le asigno un false o un 0 se elimina esa key del object
        if (!value) {
            delete object_return[key]
        }

    }

    // Se retorna el nuevo object
    return object_return
}



class MonkeyCli {

    #document_cached = {
        "time": 0,
        "document": 0,
    }

    constructor(name, path_collections, use_cache = false) {
        this.name = name

        // Path collections es donde se almacenan todos los documentos
        this.path_collections = monkey_utils.normalize_url(path_collections)
        this.use_cache = use_cache

        // Full path collection incluye el nombre de este documento con json
        this.full_path_collection = this.path_collections + "/" + this.name + ".json"
    }

    async #cache_document() {
        
        let files_list = await fs.readdir(this.path_collections + "/")
        console.log(this.use_cache, files_list)
        
        // Si no estamos en modo cache
        if (!this.use_cache) {

            // Se verifica que no exista el documento. Si no existe se retorna un false
            if (!files_list.includes(this.name + ".json")) {
                this.#document_cached["document"] = []
                return false
            }

            // Si existe el documento, se lee y se retorna true
            // guardando el contenido de el documento en una variable privada
            this.#document_cached["document"] = await read_document(this.full_path_collection)
            return true
        }

        let time_now = Date.now()

        // Si el documento no existe dentro de la carpeta de la base de datos
        if (!files_list.includes(this.name + ".json")) {
            
            // Se almacena de manera global un array vacio como tambien la hora
            this.#document_cached["time"] = time_now
            this.#document_cached["document"] = []

            // Se guarad el documento vacio para evitar que siga un siclo
            await save_document(this.full_path_collection, [])
            
            // Se retorna el array vacio indicando que no existe ningun documento asociado
            return false
        }

        // Si el documento aun no esta cacheado se lee y se guarda y se retorna true
        if (this.#document_cached["document"] === 0) {

            this.#document_cached["time"] = time_now
            this.#document_cached["document"] = await read_document(this.full_path_collection)

            return true
        }

        // Se suman 5 minutos en ms al tiempo desde que se guardo el anterior estado
        let time_cached = this.#document_cached["time"] + 3000
        
        // Si se superan los 5 minutos se actualiza el cacheado y se guarda en el documento
        if (time_cached < time_now) {
            this.#document_cached["time"] = time_now
            await save_document(this.full_path_collection, this.#document_cached["document"])
        }

        // Se retorna el documento cacheado
        return true
    }

    async find_one(object_find, object_project = null) {

        // Se verifica la existencia del archivo o si existe cache
        let exist_doc = await this.#cache_document()
        if (!exist_doc) {return {}}

        return iter_document_array(
            object_find,
            object_project,
            this.#document_cached["document"],
            "find_one"
        )

    }

    async find(object_find, object_project = null) {
        
        // Se verifica la existencia del documento        
        let exist_doc = await this.#cache_document()
        if (!exist_doc) {return []}

        return iter_document_array(object_find, object_project, this.#document_cached["document"], "find")

    }

    async insert_one(object_insert) {
        await this.#cache_document()

        let acknowledged = false
        let _id = monkey_utils.gen_uuid()

        object_insert["_id"] = _id

        // Se verifica la existencia del documento
        this.#document_cached["document"].push(object_insert)
        
        // Si no se esta usando la forma de cache se guarda el documento
        if (!this.use_cache) {
            await save_document(this.full_path_collection, this.#document_cached["document"])
        }

        acknowledged = true
        return monkey_utils.monkey_db_return(acknowledged, _id)
    }

    async insert_many(array_insert) {
        await this.#cache_document()

        let acknowledged = false
        let insertedIds = []

        for (let doc_one of array_insert) {
            
            // Se genera un id para el objeto a insertar
            let _id = monkey_utils.gen_uuid()
            
            // Se le asigna el id
            doc_one["_id"] = _id

            // Se le asigna al buffer
            this.#document_cached["document"].push(doc_one)
            insertedIds.push(_id)

        }

        
        if (!this.use_cache) {
            await save_document(this.full_path_collection, this.#document_cached["document"])
        }

        acknowledged = true
        return monkey_utils.monkey_db_return(acknowledged, null, insertedIds.length, insertedIds)
    }

    async delete_one(object_find) {
        await this.#cache_document()

        let acknowledged = false
    
        let index_delete = iter_document_array(object_find, null, this.#document_cached["document"], "delete_one")
        this.#document_cached["document"].splice(index_delete)
    
        if (!this.use_cache) {
            await save_document(this.full_path_collection, this.#document_cached["document"])
        }

        acknowledged = true
        return monkey_utils.monkey_db_return(acknowledged)

    }

    async delete_many(object_find) {
        await this.#cache_document()

        let acknowledged = false
        let array_of_index_delete = await iter_document_array(object_find, null, this.#document_cached["document"], "delete_many")
        
        for (let index_delete of array_of_index_delete) {this.#document_cached["document"].splice(index_delete)}
        
            
        if (!this.use_cache) {
            await save_document(this.full_path_collection, this.#document_cached["document"])
        }

        acknowledged = true
        return monkey_utils.monkey_db_return(acknowledged)

    }

    update_one(object_find, mod_filter) {

    }
}

class MonkeyDB {

    #collections = []

    constructor(name_db, path_db = ".", cache = false) {
        this.name_db = name_db
        this.path_db = monkey_utils.normalize_url(path_db)

        this.cache = cache
        this.uri = path_db + "/" + name_db
    }

    // Funcion privada encargada de verificar que la base de datos se encuentre en la carpeta
    async #dir_db_exist() {
        
        let db_dir = await fs.readdir(this.path_db)
        
        // De no ser asi la crea
        if (!db_dir.includes(this.name_db)) {
            await fs.mkdir(this.name_db)
        }

        // Actualiza la lista de colecciones en la bd
        this.#collections = await fs.readdir(this.uri + "/")
    }

    async create_collection(name_collection) {
        // Verifica y crea la carpeta de la base de datos si es necesario
        await this.#dir_db_exist()
        
        return new MonkeyCli(name_collection, this.uri, this.cache)
    }

    async drop_collection(name_collection) {
        await this.#dir_db_exist()

        if (!this.#collections.includes(name_collection + ".json")) {
            return false
        }

        await fs.rm(this.uri + "/" + name_collection + ".json")
        return true
    }

}


const MonkeyCLI_DB = new MonkeyDB("monkey_test", ".", false)

async function test() {
    
    
    const users = await MonkeyCLI_DB.create_collection("users")
    await users.insert_one({"name": "Jhon coe"})
    await users.insert_one({"name": "Jhon Doe", "edad": 74})

    console.log( await users.find_one({
        "name": {"$eq": "Jhon Doe"}, "edad": {"$gt": 40, "$lte": 75}
    }))

    
    console.log(await users.find_one({}))
    console.log(await users.delete_many({"_id": {"$ne": "433ed0084651103ec7602d4719f64971"}}))
}

test()