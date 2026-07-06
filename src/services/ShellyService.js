import axios from 'axios';
import ENVIROMENT from '../config/enviroment.config.js';

const LOCAL_IP = '192.168.1.105'; // Fallback local para pruebas del usuario

export async function encenderLuz() {
    const { SHELLY_CLOUD_URL, SHELLY_DEVICE_ID, SHELLY_AUTH_KEY } = ENVIROMENT;

    if (SHELLY_CLOUD_URL && SHELLY_DEVICE_ID && SHELLY_AUTH_KEY) {
        console.log(`[SHELLY CLOUD]: Enviando comando ENCENDER a dispositivo: ${SHELLY_DEVICE_ID}`);
        const url = `${SHELLY_CLOUD_URL}/device/status/control`;
        return axios.get(url, {
            params: {
                id: SHELLY_DEVICE_ID,
                auth_key: SHELLY_AUTH_KEY,
                turn: 'on',
                channel: 0
            }
        });
    }

    console.log(`[SHELLY LOCAL]: Usando fallback local a IP: ${LOCAL_IP}`);
    return axios.get(`http://${LOCAL_IP}/relay/0?turn=on`);
}

export async function apagarLuz() {
    const { SHELLY_CLOUD_URL, SHELLY_DEVICE_ID, SHELLY_AUTH_KEY } = ENVIROMENT;

    if (SHELLY_CLOUD_URL && SHELLY_DEVICE_ID && SHELLY_AUTH_KEY) {
        console.log(`[SHELLY CLOUD]: Enviando comando APAGAR a dispositivo: ${SHELLY_DEVICE_ID}`);
        const url = `${SHELLY_CLOUD_URL}/device/status/control`;
        return axios.get(url, {
            params: {
                id: SHELLY_DEVICE_ID,
                auth_key: SHELLY_AUTH_KEY,
                turn: 'off',
                channel: 0
            }
        });
    }

    console.log(`[SHELLY LOCAL]: Usando fallback local a IP: ${LOCAL_IP}`);
    return axios.get(`http://${LOCAL_IP}/relay/0?turn=off`);
}
