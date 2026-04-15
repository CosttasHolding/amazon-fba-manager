# Amazon FBA Manager V2

Aplicación web profesional para gestión de productos Amazon FBA.

## Stack Tecnológico
- Next.js 14 (App Router)
- TypeScript
- Supabase (Auth + Database + Storage)
- Tailwind CSS + shadcn/ui
- Recharts
- React Hook Form + Zod

## Instalación

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar Supabase
1. Crear proyecto en https://supabase.com
2. Copiar `.env.example` a `.env.local`
3. Completar con tus credenciales de Supabase

### 3. Ejecutar SQL Schema
1. Ir a SQL Editor en Supabase
2. Copiar y ejecutar todo el contenido de `supabase/migrations/001_init.sql`

### 4. Iniciar desarrollo
```bash
npm run dev
```

Abrir http://localhost:3000

## Estructura del Proyecto
```
amazon-fba-manager/
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (auth)/        # Páginas de autenticación
│   │   ├── (dashboard)/   # Páginas del dashboard
│   │   └── api/           # API Routes
│   ├── components/
│   │   └── ui/            # Componentes shadcn/ui
│   ├── lib/               # Utilidades y helpers
│   ├── types/             # TypeScript types
│   └── validations/       # Schemas Zod
├── supabase/
│   └── migrations/        # SQL schemas
└── public/                # Assets estáticos
```

## Funcionalidades

### Productos
- ✅ Crear, editar, eliminar productos
- ✅ Cálculo automático de ROI, ganancia, márgenes
- ✅ Búsqueda y filtros
- ✅ Exportar a Excel

### Inventario
- ✅ Gestión de stock (disponible, en tránsito, warehouse)
- ✅ Alertas automáticas (bajo stock, sin stock, sobrestock)
- ✅ Historial de movimientos

### Ventas
- ✅ Registro de ventas
- ✅ Cálculo de revenue neto
- ✅ Métricas por producto

### Dashboard
- ✅ Métricas clave (productos activos, ROI promedio, alertas)
- ✅ Top productos por rentabilidad
- ✅ Resumen visual

### Calculadora
- ✅ Estimación rápida de tarifas FBA
- ✅ Cálculo de ROI y márgenes

## Deployment

### Vercel (Recomendado)
1. Conectar repo a Vercel
2. Agregar variables de entorno
3. Deploy automático

## Soporte
Para issues o dudas, crear un issue en el repositorio.

## Licencia
MIT
