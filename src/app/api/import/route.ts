import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { productSchema } from '@/validations/product';
import * as XLSX from 'xlsx';
import { z } from 'zod';

// Mapeo de headers del Excel a campos del schema
const COLUMN_MAP: Record<string, string> = {
  'sku': 'sku',
  'asin': 'asin',
  'name': 'name',
  'nombre': 'name',
  'category': 'category',
  'categoria': 'category',
  'weight_kg': 'weightKg',
  'weight': 'weightKg',
  'peso_kg': 'weightKg',
  'peso': 'weightKg',
  'marketplace': 'marketplace',
  'unit_cost': 'unitCost',
  'costo_unitario': 'unitCost',
  'costo': 'unitCost',
  'shipping_cost': 'shippingCost',
  'costo_envio': 'shippingCost',
  'envio': 'shippingCost',
  'prep_cost': 'prepCost',
  'costo_prep': 'prepCost',
  'prep': 'prepCost',
  'taxes': 'taxes',
  'impuestos': 'taxes',
  'sale_price': 'salePrice',
  'precio_venta': 'salePrice',
  'precio': 'salePrice',
  'referral_fee': 'referralFee',
  'comision_referido': 'referralFee',
  'referral': 'referralFee',
  'fba_fee': 'fbaFee',
  'comision_fba': 'fbaFee',
  'fba': 'fbaFee',
  'storage_fee_monthly': 'storageFeeMonthly',
  'almacenamiento': 'storageFeeMonthly',
  'storage': 'storageFeeMonthly',
  'other_fees': 'otherFees',
  'otros_costos': 'otherFees',
  'otros': 'otherFees',
  'status': 'status',
  'estado': 'status',
  'notes': 'notes',
  'notas': 'notes',
};

// Campos que deben parsearse como numero
const NUMERIC_FIELDS = [
  'weightKg', 'unitCost', 'shippingCost', 'prepCost', 'taxes',
  'salePrice', 'referralFee', 'fbaFee', 'storageFeeMonthly', 'otherFees',
];

function normalizeHeader(header: string): string {
  return header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[()]/g, '');
}

function mapRowToProduct(row: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};

  for (const [rawKey, value] of Object.entries(row)) {
    const normalizedKey = normalizeHeader(rawKey);
    const schemaKey = COLUMN_MAP[normalizedKey];

    if (schemaKey) {
      if (NUMERIC_FIELDS.includes(schemaKey)) {
        const num = parseFloat(value);
        mapped[schemaKey] = isNaN(num) ? undefined : num;
      } else if (value !== undefined && value !== null && value !== '') {
        mapped[schemaKey] = String(value).trim();
      }
    }
  }

  return mapped;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const mode = formData.get('mode') as string || 'preview';

    if (!file) {
      return NextResponse.json({ error: 'No se envio un archivo' }, { status: 400 });
    }

    // Validar tipo de archivo
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/tab-separated-values',
    ];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(file.type) && !['xlsx', 'xls', 'csv', 'tsv'].includes(ext || '')) {
      return NextResponse.json(
        { error: 'Formato no soportado. Usa archivos .xlsx, .csv o .tsv' },
        { status: 400 }
      );
    }

    // Validar tamano (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo excede el limite de 5MB' },
        { status: 400 }
      );
    }

    // Leer archivo
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

    if (rawRows.length === 0) {
      return NextResponse.json(
        { error: 'El archivo esta vacio o no contiene datos' },
        { status: 400 }
      );
    }

    if (rawRows.length > 500) {
      return NextResponse.json(
        { error: 'Maximo 500 filas por importacion. El archivo tiene ' + rawRows.length + ' filas.' },
        { status: 400 }
      );
    }

    // Detectar headers y mapeo
    const originalHeaders = Object.keys(rawRows[0]);
    const headerMapping: { original: string; mapped: string | null }[] = originalHeaders.map(h => ({
      original: h,
      mapped: COLUMN_MAP[normalizeHeader(h)] || null,
    }));

    // Validar cada fila
    const results: {
      row: number;
      data: Record<string, any>;
      valid: boolean;
      errors: string[];
    }[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const mapped = mapRowToProduct(rawRows[i]);
      try {
        productSchema.parse(mapped);
        results.push({ row: i + 1, data: mapped, valid: true, errors: [] });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const errors = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
          results.push({ row: i + 1, data: mapped, valid: false, errors });
        } else {
          results.push({ row: i + 1, data: mapped, valid: false, errors: ['Error desconocido'] });
        }
      }
    }

    const validRows = results.filter(r => r.valid);
    const invalidRows = results.filter(r => !r.valid);

    // Modo preview: solo devolver resultados de validacion
    if (mode === 'preview') {
      return NextResponse.json({
        mode: 'preview',
        totalRows: rawRows.length,
        validCount: validRows.length,
        invalidCount: invalidRows.length,
        headerMapping,
        rows: results.map(r => ({
          row: r.row,
          valid: r.valid,
          errors: r.errors,
          data: r.data,
        })),
      });
    }

    // Modo import: insertar filas validas
    if (mode === 'import') {
      if (validRows.length === 0) {
        return NextResponse.json(
          { error: 'No hay filas validas para importar' },
          { status: 400 }
        );
      }

      const dbRows = validRows.map(r => ({
        user_id: user.id,
        sku: r.data.sku,
        asin: r.data.asin || null,
        name: r.data.name,
        category: r.data.category || null,
        weight_kg: r.data.weightKg || null,
        marketplace: r.data.marketplace || 'US',
        unit_cost: r.data.unitCost || 0,
        shipping_cost: r.data.shippingCost || 0,
        prep_cost: r.data.prepCost || 0,
        taxes: r.data.taxes || 0,
        sale_price: r.data.salePrice || 0,
        referral_fee: r.data.referralFee || 0,
        fba_fee: r.data.fbaFee || 0,
        storage_fee_monthly: r.data.storageFeeMonthly || 0,
        other_fees: r.data.otherFees || 0,
        status: r.data.status || 'active',
        notes: r.data.notes || null,
      }));

      // Insert en batches de 50
      const batchSize = 50;
      let insertedCount = 0;
      let insertErrors: string[] = [];

      for (let i = 0; i < dbRows.length; i += batchSize) {
        const batch = dbRows.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('products')
          .insert(batch)
          .select('id');

        if (error) {
          insertErrors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          insertedCount += (data?.length || 0);
        }
      }

      return NextResponse.json({
        mode: 'import',
        totalRows: rawRows.length,
        validCount: validRows.length,
        invalidCount: invalidRows.length,
        insertedCount,
        insertErrors,
        invalidRows: invalidRows.map(r => ({
          row: r.row,
          errors: r.errors,
          data: r.data,
        })),
      });
    }

    return NextResponse.json({ error: 'Modo no valido' }, { status: 400 });
  } catch (err: any) {
    console.error('Import error:', err);
    return NextResponse.json(
      { error: err.message || 'Error al procesar el archivo' },
      { status: 500 }
    );
  }
}