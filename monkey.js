const fs = require("fs/promises")
const crypto = require("crypto")

function monkey_db_return(acknowledged, _id = null, insertedCount = null, insertedIds = null) {
    
    let return_vars = {
        "acknowledged": acknowledged,
        "_id": _id,
        "insertedCount": insertedCount
    }


    // Se itera cada clave valor de el diccionario y se eliminan los vacios
    let key, value
    for ([key, value] of Object.entries(return_vars)) {
        if (value === null) {
            delete return_vars[key]
        }
    }

    return return_vars
}

function normalize_url(url = "") {
    if (url.endsWith("/")) {return url.slice(0, -1)}
    return url
}

function gen_uuid() {
    let uuid = String(Date.now())
    return crypto.createHash("md5").update(uuid).digest("hex")
}

async function read_document(name) {
    let document_read = await fs.readFile(name)
    return JSON.parse(document_read)
}

async function save_document(name, new_document_object) {
    await fs.writeFile(name, JSON.stringify(new_document_object))
}

function project(object_return, object_project) {
    
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
        this.path_collections = normalize_url(path_collections)
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

        // Se establece el numero de coincidencias desde el objeto a buscar
        let check = Object.values(object_find).length

        // Por cada documento encontrado se revisara que cumpla con el filtro enviado
        for (let one_doc of this.#document_cached["document"]) {
            
            // Contador de coincidencias por usuario
            let passed_check = 0

            // Se setean las variables para usarle dentro del for
            let key, value
            
            for ([key, value] of Object.entries(object_find)) {
                if (one_doc[key] === value) {passed_check += 1}
            }

            // Se retorna la primera coincidencia con la proyeccion
            if (passed_check === check) {
                return project(one_doc, object_project)
            }

        }

        return {}

    }

    async find(object_find, object_project = null) {
        
        // Se verifica la existencia del documento        
        let exist_doc = await this.#cache_document()
        if (!exist_doc) {return []}

        // Se establece el numero de coincidencias desde el objeto a buscar
        let check = Object.values(object_find).length
        let return_doc = []

        // Por cada documento encontrado se revisara que cumpla con el filtro enviado
        for (let one_doc of this.#document_cached["document"]) {

            // Cantidad de coincidencias
            let passed_check = 0

            // Se setean las variables para usarle dentro del for
            let key, value

            for ([key, value] of Object.entries(object_find)) {
                if (one_doc[key] === value) {passed_check += 1}
            }

            // Se retorna la primera coincidencia
            if (passed_check === check) {

                return_doc.push(
                    project(one_doc, object_project)
                )
            
            }

        }

        return return_doc

    }

    async insert_one(object_insert) {
        await this.#cache_document()

        let acknowledged = false
        let _id = gen_uuid()

        object_insert["_id"] = _id

        // Se verifica la existencia del documento
        this.#document_cached["document"].push(object_insert)
        
        // Si no se esta usando la forma de cache se guarda el documento
        if (!this.use_cache) {
            await save_document(this.full_path_collection, this.#document_cached["document"])
        }

        acknowledged = true
        return monkey_db_return(acknowledged, _id)
    }

    async insert_many(array_insert) {
        await this.#cache_document()

        let acknowledged = false
        let insertedIds = []

        for (let doc_one of array_insert) {
            
            // Se genera un id para el objeto a insertar
            let _id = gen_uuid()
            
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
        return monkey_db_return(acknowledged, null, insertedIds.length, insertedIds)
    }

    update_one(object_find, mod_filter) {

    }
}

class MonkeyDB {

    #collections = []

    constructor(name_db, path_db = ".", cache = false) {
        this.name_db = name_db
        this.path_db = normalize_url(path_db)

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

async function main() {
    
    
    const users = await MonkeyCLI_DB.create_collection("users")
    console.log(await MonkeyCLI_DB.drop_collection("users"))

}

main()