import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Headers del template con nombres descriptivos
    const headers = [
      'sku',
      'asin',
      'name',
      'category',
      'weight_kg',
      'marketplace',
      'unit_cost',
      'shipping_cost',
      'prep_cost',
      'taxes',
      'sale_price',
      'referral_fee',
      'fba_fee',
      'storage_fee_monthly',
      'other_fees',
      'status',
      'notes',
    ];

    // Fila de ejemplo
    const exampleRow = {
      sku: 'PROD-001',
      asin: 'B0EXAMPLE01',
      name: 'Producto de ejemplo',
      category: 'Electronics',
      weight_kg: 0.5,
      marketplace: 'US',
      unit_cost: 8.50,
      shipping_cost: 2.00,
      prep_cost: 1.50,
      taxes: 0.75,
      sale_price: 24.99,
      referral_fee: 3.75,
      fba_fee: 5.20,
      storage_fee_monthly: 0.30,
      other_fees: 0,
      status: 'active',
      notes: 'Ejemplo - borrar esta fila',
    };

    // Fila con instrucciones
    const instructionRow = {
      sku: '(obligatorio)',
      asin: '(opcional)',
      name: '(obligatorio)',
      category: 'Electronics|Toys|Home|Kitchen|Health|Beauty|Sports|Books|Other',
      weight_kg: '(numero, opcional)',
      marketplace: 'US|MX|CA|UK|DE|FR|IT|ES',
      unit_cost: '(numero, obligatorio)',
      shipping_cost: '(numero, default 0)',
      prep_cost: '(numero, default 0)',
      taxes: '(numero, default 0)',
      sale_price: '(numero, obligatorio)',
      referral_fee: '(numero, default 0)',
      fba_fee: '(numero, default 0)',
      storage_fee_monthly: '(numero, default 0)',
      other_fees: '(numero, default 0)',
      status: 'active|paused|discontinued',
      notes: '(texto libre, opcional)',
    };

    const worksheet = XLSX.utils.json_to_sheet([instructionRow, exampleRow], {
      header: headers,
    });

    // Ajustar ancho de columnas
    worksheet['!cols'] = headers.map(h => ({
      wch: Math.max(h.length + 2, 18),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_productos_costtasholding.xlsx"',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}