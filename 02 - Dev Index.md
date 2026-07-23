---
tipo: moc
tags: [index, desarrollo, convenciones]
ultima_actualizacion: 2026-07-22
---

# Dev Index - Desarrollo

> Convenciones, patrones y guias para desarrollar en el proyecto.

---

## Convenciones

- [[CONVENTIONS]] - Reglas de codigo, nomenclatura, estructura de archivos

## UI y Diseno

- [[UI-PATTERNS]] - Patrones de componentes, layout, formularios
- [[DESIGN_SYSTEM]] - Tokens, colores, tipografia, espaciado

## Reglas Clave

1. **TypeScript strict** - Nunca usar `any`
2. **CSS variables** - Siempre `bg-background`, nunca `bg-white`
3. **snake_case** en DB/API, **camelCase** en frontend
4. **Zod** para toda validacion
5. **sonner** para toast, nunca alerts nativos
6. **calculations.ts** es inmutable

## Patron para nuevos modulos

```
1. Copiar modulo mas cercano
2. Crear page.tsx en src/app/(dashboard)/[module]/
3. Crear API route en src/app/api/[entity]/route.ts
4. Crear hook en src/hooks/use-[name].ts
5. Crear validacion en src/validations/[entity].ts
6. Agregar tipos en src/types/index.ts
```

## Herramientas

- **Lint**: `npm run lint`
- **Typecheck**: `npm run typecheck`
- **Build**: `npm run build`
- **Dev**: `npm run dev` (puerto 3000)
