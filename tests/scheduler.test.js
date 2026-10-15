import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as SchedulerService from '../src/services/SchedulerService.js';
import * as ShellyService from '../src/services/ShellyService.js';
import axios from 'axios';

describe('Suite de Robustez de Hardware y Scheduler (ROB-01 & ROB-02)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        SchedulerService.detenerSincronizadorLuces();
    });

    describe('Control de Reentrada (Mutex) en SchedulerService (ROB-02)', () => {
        it('debe abortar la segunda ejecución concurrente cuando un ciclo ya está en progreso', async () => {
            // Simulamos que procesarCancelacionesAutomaticas tarda 50ms
            let resolvePrimeraEjecucion;
            const promesaLenta = new Promise(resolve => {
                resolvePrimeraEjecucion = resolve;
            });

            vi.spyOn(SchedulerService, 'procesarCancelacionesAutomaticas').mockImplementation(async () => {
                await promesaLenta;
            });
            vi.spyOn(SchedulerService, 'checkActiveCanchaReservation').mockResolvedValue(false);
            vi.spyOn(SchedulerService, 'checkActiveQuinchoAireReservation').mockResolvedValue(false);

            const warnSpy = vi.spyOn(console, 'warn');

            // 1. Disparamos la primera ejecución (asíncrona en progreso)
            const ejecucion1 = SchedulerService.sincronizarLuces();

            // Verificamos que el flag de mutex esté activo
            expect(SchedulerService.getSyncStatus()).toBe(true);

            // 2. Disparamos la segunda ejecución inmediatamente mientras la primera sigue corriendo
            const ejecucion2Resultado = await SchedulerService.sincronizarLuces();

            // 🔒 Certificación: La segunda ejecución fue abortada inmediatamente por el mutex
            expect(ejecucion2Resultado).toBe(false);
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Ciclo anterior de sincronización aún en ejecución. Abortando tick actual')
            );

            // 3. Concluimos la primera ejecución
            resolvePrimeraEjecucion();
            const ejecucion1Resultado = await ejecucion1;
            expect(ejecucion1Resultado).toBe(true);

            // 🔒 Certificación: El mutex se liberó en el bloque finally
            expect(SchedulerService.getSyncStatus()).toBe(false);

            // 4. Una tercera ejecución posterior debe poder correr normalmente
            const ejecucion3Resultado = await SchedulerService.sincronizarLuces();
            expect(ejecucion3Resultado).toBe(true);
        });
    });

    describe('Timeouts y Manejo de Errores en ShellyService (ROB-01)', () => {
        it('debe tener configurado SHELLY_HTTP_TIMEOUT en 5000 ms', () => {
            expect(ShellyService.SHELLY_HTTP_TIMEOUT).toBe(5000);
        });

        it('debe enviar la opción timeout: 5000 en llamadas axios para evitar sockets colgados', async () => {
            const axiosPostSpy = vi.spyOn(axios, 'post').mockResolvedValue({
                data: { isok: true }
            });

            await ShellyService.encenderLuz().catch(() => {});

            if (axiosPostSpy.mock.calls.length > 0) {
                const configArg = axiosPostSpy.mock.calls[0][2];
                expect(configArg).toHaveProperty('timeout', 5000);
            }
        });

        it('debe capturar errores de red en ShellyService y no dejar caer el proceso', async () => {
            vi.spyOn(axios, 'post').mockRejectedValue(new Error('ETIMEDOUT'));
            vi.spyOn(axios, 'get').mockRejectedValue(new Error('ETIMEDOUT'));

            await expect(ShellyService.encenderLuz()).rejects.toThrow(
                /Error de comunicación con Shelly Cancha/i
            );
        });
    });
});
