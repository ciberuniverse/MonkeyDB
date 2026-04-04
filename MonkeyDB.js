const fs = require("fs/promises")
const monkey_document = require("./modules/native_documents.js")
const monkey_utils = require("./modules/utils.js")

async function read_document(name) {
    let document_read = await fs.readFile(name)
    return JSON.parse(document_read)
}

async function save_document(name, new_document_object) {
    await fs.writeFile(name, JSON.stringify(new_document_object))
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

        return monkey_document.iter_document_array(
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

        return monkey_document.iter_document_array(object_find, object_project, this.#document_cached["document"], "find")

    }

    async insert_one(object_insert) {
        await this.#cache_document()

        let _id = object_insert["_id"] || monkey_utils.gen_uuid()

        object_insert["_id"] = _id

        // Se verifica la existencia del documento
        this.#document_cached["document"].push(object_insert)
        
        // Si no se esta usando la forma de cache se guarda el documento
        if (!this.use_cache) {
            await save_document(this.full_path_collection, this.#document_cached["document"])
        }

        return monkey_utils.monkey_db_return({
            "acknowledged": true,
            "_id": _id,
            "insertedCount": 1
        })
    }

    async insert_many(array_insert) {
        await this.#cache_document()

        let insertedIds = []

        for (let doc_one of array_insert) {
            
            // Se genera un id para el objeto a insertar
            let _id = doc_one["_id"] || monkey_utils.gen_uuid()
            
            // Se le asigna el id
            doc_one["_id"] = _id

            // Se le asigna al buffer
            this.#document_cached["document"].push(doc_one)
            insertedIds.push(_id)

        }

        if (!insertedIds) {
            return monkey_utils.monkey_db_return({
                "acknowledged": false,
                "insertedCount": 0,
                "insertedIds": []
            })
        }

        
        if (!this.use_cache) {
            await save_document(this.full_path_collection, this.#document_cached["document"])
        }

        return monkey_utils.monkey_db_return({
            "acknowledged": true,
            "insertedCount": insertedIds.length,
            "insertedIds": insertedIds
        })
    }

    async delete_one(object_find) {
        await this.#cache_document()

        let acknowledged = false
    
        let index_delete = monkey_document.iter_document_array(object_find, null, this.#document_cached["document"], "delete_one")
        this.#document_cached["document"].splice(index_delete)
    
        if (!this.use_cache) {
            await save_document(this.full_path_collection, this.#document_cached["document"])
        }

        return monkey_utils.monkey_db_return({
            "acknowledged": true,
            "deletedCount": 1,
        })
    }

    async delete_many(object_find) {
        await this.#cache_document()

        let array_of_index_delete = await monkey_document.iter_document_array(object_find, null, this.#document_cached["document"], "delete_many")
        
        if (!array_of_index_delete) {
            return monkey_utils.monkey_db_return({
                "acknowledged": false,
                "deletedCount": 0
            })
        }

        for (let index_delete of array_of_index_delete) {
            this.#document_cached["document"].splice(index_delete)
        }
        
            
        if (!this.use_cache) {
            await save_document(this.full_path_collection, this.#document_cached["document"])
        }

        let deleted_account = array_of_index_delete.length
        return monkey_utils.monkey_db_return({
            "acknowledged": true,
            "deletedCount": deleted_account
        })

    }

    async update_one(object_find, mod_filter) {
        await this.#cache_document()

        
        let response = await monkey_document.iter_document_array(object_find, mod_filter, this.#document_cached["document"], "update_one")
        
        let new_document = response[0]

        if (!new_document) {return monkey_utils.monkey_db_return({
            "acknowledged": false,
            "matchedCount": 0,
            "modifiedCount": 0
        })}

        let index_update = response[1]

        this.#document_cached["document"][index_update] = new_document

        if (!this.use_cache) {
            await save_document(this.full_path_collection, this.#document_cached["document"])
        }

        return monkey_utils.monkey_db_return({
            "acknowledged": true,
            "matchedCount": 1,
            "modifiedCount": 1
        })

    }

    async update_many(object_find, mod_filter) {
        await this.#cache_document()

        
        let response = await monkey_document.iter_document_array(object_find, mod_filter, this.#document_cached["document"], "update_many")

        for (let doc_updated of response) {

            let new_document = doc_updated[0]
            let index_update = doc_updated[1]

            this.#document_cached["document"][index_update] = new_document
        
        }

        if (!this.use_cache) {
            await save_document(this.full_path_collection, this.#document_cached["document"])
        }

        let mod_count = response.length
        return monkey_utils.monkey_db_return({
            "acknowledged": true,
            "modifiedCount": mod_count,
            "matchedCount": mod_count
        })
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

// Se exporta unicamente MonkeyDB encargado de crear la base de datos
module.exports = {MonkeyDB}