import axios from 'axios';

const SHELLY_IP = '192.168.1.105';

export async function encenderLuz() {
    return axios.get(`http://${SHELLY_IP}/relay/0?turn=on`);
}

export async function apagarLuz() {
    return axios.get(`http://${SHELLY_IP}/relay/0?turn=off`);
}
