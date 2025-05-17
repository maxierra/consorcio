const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Crear un libro de trabajo nuevo
const workbook = XLSX.utils.book_new();

// Definir los datos de ejemplo
const data = [
  {
    'Número': '101',
    'Tipo': 'Departamento',
    'Nombre del Propietario': 'Juan Pérez',
    'Email del Propietario': 'juan@ejemplo.com',
    'Teléfono del Propietario': '1155667788',
    'Coeficiente': '10.5',
    'Expensas Ordinarias A': 'SI',
    'Expensas Ordinarias B': 'SI',
    'Expensas Aysa': 'SI'
  },
  {
    'Número': '102',
    'Tipo': 'Departamento',
    'Nombre del Propietario': 'María García',
    'Email del Propietario': 'maria@ejemplo.com',
    'Teléfono del Propietario': '1144556677',
    'Coeficiente': '8.3',
    'Expensas Ordinarias A': 'SI',
    'Expensas Ordinarias B': 'SI',
    'Expensas Aysa': 'SI'
  },
  {
    'Número': '103',
    'Tipo': 'Cochera',
    'Nombre del Propietario': 'Carlos López',
    'Email del Propietario': 'carlos@ejemplo.com',
    'Teléfono del Propietario': '1133445566',
    'Coeficiente': '2.1',
    'Expensas Ordinarias A': 'SI',
    'Expensas Ordinarias B': 'NO',
    'Expensas Aysa': 'SI'
  },
  {
    'Número': '104',
    'Tipo': 'Local',
    'Nombre del Propietario': 'Ana Martínez',
    'Email del Propietario': 'ana@ejemplo.com',
    'Teléfono del Propietario': '1122334455',
    'Coeficiente': '15.2',
    'Expensas Ordinarias A': 'SI',
    'Expensas Ordinarias B': 'NO',
    'Expensas Aysa': 'SI'
  },
  {
    'Número': '105',
    'Tipo': 'Departamento',
    'Nombre del Propietario': 'Roberto Sánchez',
    'Email del Propietario': 'roberto@ejemplo.com',
    'Teléfono del Propietario': '1111223344',
    'Coeficiente': '9.8',
    'Expensas Ordinarias A': 'SI',
    'Expensas Ordinarias B': 'SI',
    'Expensas Aysa': 'SI'
  },
  {
    'Número': '106',
    'Tipo': 'Baulera',
    'Nombre del Propietario': 'Laura Rodríguez',
    'Email del Propietario': 'laura@ejemplo.com',
    'Teléfono del Propietario': '1100112233',
    'Coeficiente': '1.2',
    'Expensas Ordinarias A': 'SI',
    'Expensas Ordinarias B': 'NO',
    'Expensas Aysa': 'SI'
  }
];

// Crear una hoja de cálculo con los datos
const worksheet = XLSX.utils.json_to_sheet(data);

// Ajustar el ancho de las columnas
const colWidths = [
  { wch: 10 },  // Número
  { wch: 15 },  // Tipo
  { wch: 25 },  // Nombre del Propietario
  { wch: 25 },  // Email del Propietario
  { wch: 20 },  // Teléfono del Propietario
  { wch: 12 },  // Coeficiente
  { wch: 20 },  // Expensas Ordinarias A
  { wch: 20 },  // Expensas Ordinarias B
  { wch: 15 }   // Expensas Aysa
];

worksheet['!cols'] = colWidths;

// Añadir la hoja al libro
XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla Unidades');

// Escribir el archivo
const outputPath = path.join(__dirname, '../../public/plantilla_importacion_unidades.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log(`Plantilla Excel creada en: ${outputPath}`);
