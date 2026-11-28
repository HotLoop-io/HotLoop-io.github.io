// English-only search copy: titles, descriptions and a few headings written around the words people
// type. Translations keep their own catalogs, so nothing here changes a key in any other language.
export const EN_SEO: Record<string, string> = {
  'h.title': 'ISA-18.2 Alarm Management and PLC Gateway | HotLoop',
  'h.desc': 'ISA-18.2 alarm management software and a PLC historian in one box. OPC UA, Modbus, EtherNet/IP, S7 and MQTT, on a Raspberry Pi or across every site.',
  'h.h1': 'ISA-18.2 alarm management and a PLC historian in one box',
  'gw.title': 'MQTT Historian and PLC Historian Software | HotLoop Gateway',
  'gw.desc': 'MQTT historian and industrial historian software with industrial alarm management software and a PLC gateway. ISA-18.2 alarms, OPC UA, Modbus and MQTT.',
  'gw.h1': 'Industrial alarm management software and industrial historian software: a PLC gateway with a PLC historian and MQTT historian in one box',
  'iot.title': 'HotLoop IoT: Raspberry Pi PLC gateway, built in Go for OT',
  'iot.desc': 'HotLoop IoT runs on a Raspberry Pi beside your PLC: it reads it, keeps the history, and raises alarms. Written in Go. {version} is out. Free for home and lab.',
  'tx.desc': 'OPC UA PubSub from your PLC: HotLoop Transmitter is a CODESYS library that publishes UADP over UDP, written in Structured Text.',
  'fw.desc': 'Node-RED alternatives that run your flows: a compatible engine in one Go binary, bounded queues, a thread per node. Free for home and lab, public source.',
  'gw.lede': 'Run a whole site from one box. The Gateway connects to your PLCs, drives and meters over the protocols they already speak, keeps every value with its quality, alarms to ISA-18.2, and rolls up every site onto one screen. A dead sensor shows as a dead sensor, and nothing moves a machine until someone with the authority arms it, so what the screen says is what the plant is doing.',
  'iot.lede': 'IoT is the automation base for the plant floor. One small program reads your equipment, keeps the history, raises the alarm, and moves a machine only after you arm that one tag. Start it on a Raspberry Pi tonight, and move it up to Edge or the Gateway later without losing your devices, tags or history.',
};
