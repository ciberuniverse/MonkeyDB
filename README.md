# MonkeyDB

> Una base de datos NoSQL local para Node.js, inspirada en MongoDB y construida con pura curiosidad y ganas de aprender.

![Si no estoy durmiendo, estoy programando](assets/monkeydb.png)  
*Si no estoy durmiendo, estoy programando.*

MonkeyDB es una base de datos experimental que almacena datos en archivos JSON, diseñada para proyectos pequeños que necesitan una API familiar de MongoDB sin levantar un servidor externo. Nació como un ejercicio de aprendizaje y para cubrir una necesidad personal: quería una base de datos local y liviana que se sintiera como MongoDB, pero sin saber que ya existían varias alternativas consolidadas. Así que… ¿Por qué no construir la mía?

## Características

- **API inspirada en MongoDB** – usa métodos como `find()`, `insert_one()`, `insert_many()`.
- **Almacenamiento local** – cada colección se guarda como un archivo JSON.
- **Proyecciones** – puedes elegir qué campos devolver en las consultas (`{ "_id": 0 }`).
- **Caché opcional** – mejora el rendimiento cuando trabajas con colecciones grandes.
- **Manejo asíncrono** – basado en `fs/promises` para no bloquear el event loop.
- **Multi‑colección** – agrupa tus datos en colecciones dentro de una misma base de datos.

## Instalación

```
npm init -y
npm install monkey-ldb
```

## Uso básico

```javascript
const { MonkeyDB } = require('monkey-ldb');

(async () => {
  // Crear o abrir una base de datos
  const db = new MonkeyDB('mi_app', './data', false);

  // Crear una colección (automáticamente crea la carpeta si no existe)
  const users = await db.create_collection('users');

  // Insertar un documento
  const result = await users.insert_one({ name: 'Ana', age: 28 });
  console.log(result); // { acknowledged: true, _id: '...' }

  // Insertar varios documentos
  await users.insert_many([
    { name: 'Luis', age: 34 },
    { name: 'Elena', age: 25 }
  ]);

  // Buscar documentos con filtro y proyección
  const ana = await users.find_one({ name: 'Ana' }, { _id: 0 });
  console.log(ana); // { name: 'Ana', age: 28 }

  const mayores = await users.find({ age: { $gt: 30 } }); // pronto operadores
  console.log(mayores); // []
})();
```

## API

### `MonkeyDB(name_db, path_db, options)`
- `name_db` – nombre de la base de datos (se usará como carpeta).
- `path_db` – ruta donde se almacenará la carpeta de la base de datos (por defecto `"."`).
- `cache` – habilita el sistema de caché experimental (por defecto `false`).

### `db.create_collection(name_collection)`
Crea una nueva colección (si no existe) y devuelve una instancia de `MonkeyCli`.

### `collection.insert_one(document)`
Inserta un documento y devuelve un objeto con `acknowledged` y el `_id` generado.

### `collection.insert_many(array)`
Inserta un array de documentos y devuelve `acknowledged`, `insertedCount` e `insertedIds`.

### `collection.find(filter, projection)`
Devuelve un array con todos los documentos que coinciden con el filtro.  
`projection` permite excluir campos con `{ campo: 0 }`.

### `collection.find_one(filter, projection)`
Devuelve el primer documento que coincide con el filtro, o `{}` si no hay resultados.

## Estado actual y roadmap

MonkeyDB está en una fase **experimental**. Lo que ya funciona:

- `create_collection`
- `insert_one` / `insert_many`
- `find` / `find_one` con proyecciones básicas (solo exclusión)
- Operadores de consulta: `$gt`, `$lt`, `$in`, `$regex`, etc.
- Actualizaciones: `update_one`, `update_many`
- Eliminaciones: `delete_one`, `delete_many`
- Caché funcional (actualmente en pruebas)
- Uso asíncrono con `fs/promises`
- Rutas configurables
- Tests manuales

Próximas mejoras (¡contribuciones bienvenidas!):

- 🔄 Índices para mejorar búsquedas
- 🔄 Migración hacia/desde otras bases de datos (MongoDB, SQLite, etc.)
- 🔄 Tests unitarios y de integración

## Módulos

MonkeyDB está organizado en tres módulos internos que mantienen el código limpio y extensible:

| Módulo | Archivo | Propósito |
|--------|---------|-----------|
| **Operadores de actualización** | `operators_update.js` | Contiene todas las funciones y utilidades para acciones de update: `$set`, `$unset`, `$rename`, `$max`, `$min`, `$currentDate`, `$push`, `$pull`, etc. Exporta como única utilidad la función `operators_update`. |
| **Operadores de búsqueda** | `operators.js` | Implementa los operadores de consulta: `$ne`, `$nin`, `$in`, `$eq`, `$lt`, `$gt`, etc. Exporta como única función `operators_find`. |
| **Utilidades** | `utils.js` | Funciones de mantenimiento y ayuda, como las respuestas uniformes de MonkeyDB (consistencia en los formatos de salida). |

Estos módulos se integran en el archivo principal y permiten añadir nuevos operadores sin modificar la lógica central.

## Agradecimientos

Este proyecto está fuertemente inspirado en **MongitaDB**, una base de datos local que a su vez emula MongoDB. ¡Gracias a su creador por allanar el camino y sacarme de varios apuros mientras desarrollaba otros proyectos!