import axios from 'axios';
import ENVIROMENT from '../config/enviroment.config.js';

const LOCAL_IP = '192.168.1.105'; // Fallback local para pruebas del usuario

export async function encenderLuz() {
    const { SHELLY_CLOUD_URL, SHELLY_DEVICE_ID, SHELLY_AUTH_KEY } = ENVIROMENT;

    if (SHELLY_CLOUD_URL && SHELLY_DEVICE_ID && SHELLY_AUTH_KEY) {
        console.log(`[SHELLY CLOUD]: Enviando comando ENCENDER a dispositivo: ${SHELLY_DEVICE_ID}`);
        const url = `${SHELLY_CLOUD_URL}/device/relay/control`;
        
        const params = new URLSearchParams();
        params.append('id', SHELLY_DEVICE_ID);
        params.append('auth_key', SHELLY_AUTH_KEY);
        params.append('turn', 'on');
        params.append('channel', '0');

        return axios.post(url, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
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
        const url = `${SHELLY_CLOUD_URL}/device/relay/control`;

        const params = new URLSearchParams();
        params.append('id', SHELLY_DEVICE_ID);
        params.append('auth_key', SHELLY_AUTH_KEY);
        params.append('turn', 'off');
        params.append('channel', '0');

        return axios.post(url, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }

    console.log(`[SHELLY LOCAL]: Usando fallback local a IP: ${LOCAL_IP}`);
    return axios.get(`http://${LOCAL_IP}/relay/0?turn=off`);
}
