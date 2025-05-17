const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Crear un libro de trabajo nuevo
const wb = XLSX.utils.book_new();

// Datos de ejemplo
const data = [
  {
    "Número": "101",
    "Tipo": "Departamento",
    "Nombre del Propietario": "Juan Pérez",
    "Email del Propietario": "juan@ejemplo.com",
    "Teléfono del Propietario": "1155667788",
    "Coeficiente": 10.5,
    "Expensas Ordinarias A": "SI",
    "Expensas Ordinarias B": "SI",
    "Expensas Aysa": "SI"
  },
  {
    "Número": "102",
    "Tipo": "Departamento",
    "Nombre del Propietario": "María García",
    "Email del Propietario": "maria@ejemplo.com",
    "Teléfono del Propietario": "1144556677",
    "Coeficiente": 8.3,
    "Expensas Ordinarias A": "SI",
    "Expensas Ordinarias B": "SI",
    "Expensas Aysa": "SI"
  },
  {
    "Número": "103",
    "Tipo": "Cochera",
    "Nombre del Propietario": "Carlos López",
    "Email del Propietario": "carlos@ejemplo.com",
    "Teléfono del Propietario": "1133445566",
    "Coeficiente": 2.1,
    "Expensas Ordinarias A": "SI",
    "Expensas Ordinarias B": "NO",
    "Expensas Aysa": "SI"
  }
];

// Crear una hoja de trabajo
const ws = XLSX.utils.json_to_sheet(data);

// Añadir la hoja al libro
XLSX.utils.book_append_sheet(wb, ws, "Plantilla");

// Escribir a un archivo
const outputPath = path.join(__dirname, '../../public/plantilla_importacion_unidades.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`Plantilla creada en: ${outputPath}`);
