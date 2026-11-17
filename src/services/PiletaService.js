import { PiletaRepository } from '../repositories/pileta.repository.js';

export class PiletaService {
  /**
   * Obtener configuración pública y tarifas
   */
  static async getConfig() {
    return await PiletaRepository.getConfig();
  }

  /**
   * Actualizar configuración (tarifas, horarios, abierta/cerrada)
   */
  static async updateConfig(data) {
    const camposPrecio = [
      'precio_adulto',
      'precio_nino',
      'precio_adulto_finde_res',
      'precio_nino_finde_res',
      'precio_adulto_finde_nores',
      'precio_nino_finde_nores',
      'carnet_mayor_dic',
      'carnet_mayor_ene',
      'carnet_mayor_feb',
      'carnet_menor_dic',
      'carnet_menor_ene',
      'carnet_menor_feb'
    ];

    const payload = {
      abierta: data.abierta !== undefined ? (data.abierta ? 1 : 0) : undefined,
      horarios: data.horarios,
      mensaje_estado: data.mensaje_estado
    };

    for (const campo of camposPrecio) {
      if (data[campo] !== undefined && data[campo] !== null && data[campo] !== '') {
        const val = Number(data[campo]);
        if (val < 0) {
          throw new Error(`El valor de ${campo} no puede ser negativo`);
        }
        payload[campo] = val;
      }
    }

    return await PiletaRepository.updateConfig(payload);
  }

  /**
   * Registrar nueva venta de entradas en boletería
   */
  static async registrarVenta({
    cant_adultos = 0,
    cant_ninos = 0,
    cant_gratis = 0,
    medio_pago = 'efectivo',
    modalidad_tarifa = 'semana',
    usuario = null
  }) {
    const adultos = Math.max(0, parseInt(cant_adultos, 10) || 0);
    const ninos = Math.max(0, parseInt(cant_ninos, 10) || 0);
    const gratis = Math.max(0, parseInt(cant_gratis, 10) || 0);

    const totalPersonas = adultos + ninos + gratis;
    if (totalPersonas <= 0) {
      throw new Error('Debes indicar al menos una entrada (Mayor, Menor o Exento/Gratis)');
    }

    const medioNormalizado = (medio_pago || 'efectivo').toLowerCase();
    if (!['efectivo', 'transferencia'].includes(medioNormalizado)) {
      throw new Error('El medio de pago debe ser efectivo o transferencia');
    }

    // Consultar tarifas actuales vigentes según modalidad seleccionada
    const config = await PiletaRepository.getConfig();
    let precioAdulto = Number(config.precio_adulto) || 4000;
    let precioNino = Number(config.precio_nino) || 3000;

    if (modalidad_tarifa === 'finde_residente') {
      precioAdulto = Number(config.precio_adulto_finde_res) || 6000;
      precioNino = Number(config.precio_nino_finde_res) || 4000;
    } else if (modalidad_tarifa === 'finde_no_residente') {
      precioAdulto = Number(config.precio_adulto_finde_nores) || 8000;
      precioNino = Number(config.precio_nino_finde_nores) || 5000;
    }

    const totalCalculado = (adultos * precioAdulto) + (ninos * precioNino);

    const cajeroNombre = usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : 'Boletería';
    const usuarioId = usuario?.id || null;

    const insertId = await PiletaRepository.registrarVenta({
      cant_adultos: adultos,
      cant_ninos: ninos,
      cant_gratis: gratis,
      precio_adulto_unitario: precioAdulto,
      precio_nino_unitario: precioNino,
      total: totalCalculado,
      medio_pago: medioNormalizado,
      usuario_id: usuarioId,
      cajero_nombre: cajeroNombre
    });

    const ventaRegistrada = await PiletaRepository.getVentaById(insertId);
    const resumenActualizado = await PiletaRepository.getResumenHoy();

    return {
      venta: ventaRegistrada,
      resumen: resumenActualizado
    };
  }

  /**
   * Obtener ventas y arqueo de caja de hoy
   */
  static async getCajaHoy() {
    const [ventas, resumen, config] = await Promise.all([
      PiletaRepository.getVentasHoy(),
      PiletaRepository.getResumenHoy(),
      PiletaRepository.getConfig()
    ]);

    return {
      ventas,
      resumen,
      config
    };
  }

  /**
   * Anular una venta de entrada errónea
   */
  static async anularVenta(id, motivo, usuario) {
    const venta = await PiletaRepository.getVentaById(id);
    if (!venta) {
      throw new Error('La venta indicada no existe');
    }
    if (venta.estado === 'anulado') {
      throw new Error('La venta ya se encuentra anulada');
    }

    const motivoCompleto = motivo || `Anulada por ${usuario?.nombre || 'operador'}`;
    await PiletaRepository.anularVenta(id, motivoCompleto);

    const [ventas, resumen] = await Promise.all([
      PiletaRepository.getVentasHoy(),
      PiletaRepository.getResumenHoy()
    ]);

    return {
      message: 'Venta anulada correctamente',
      ventas,
      resumen
    };
  }

  /**
   * Consultar historial por fecha específica
   */
  static async getHistorialPorFecha(fechaStr) {
    if (!fechaStr) {
      throw new Error('Debe especificar una fecha válida');
    }
    return await PiletaRepository.getVentasPorFecha(fechaStr);
  }
}
