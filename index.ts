/**
 * Author: Kyle
 * Description: This code scans the local WiFi network (wlan0) to detect other connected devices.
 *
 * NOTICE:
 * This code is shared for educational and non-commercial use.
 * If you modified or used parts of this code, please give proper credit.
*/

import { execSync } from "child_process";
import ping from "ping";

type PingRes = {
  ip: string,
  took: number
}

// XXX: THIS IS MY METHOD FOR GETTING THE WLAN IPv4 Address
// XXX: DON'T JUDGE ME, LOL.
function getWlanIp(): string {
  console.log(`Retrieving network interfaces...`);
  let ifconfig: string;
  try {
    ifconfig = execSync("ifconfig", { stdio: ["pipe", "pipe", "ignore"], encoding: "utf-8" });
  } catch (e: any) {
    throw new Error(`Error running "ifconfig": ${e.message}`);
  }

  const wlan0Index = ifconfig.indexOf("wlan0");
  if (wlan0Index === -1) {
    console.log("'wlan0' interface not found. Is WiFi or Hotspot enabled?");
    throw new Error("Hotspot or WiFi is not turned on");
  }
  console.log("Found 'wlan0' interface. Parsing details...");

  const wlanint = ifconfig.slice(wlan0Index);
  for (const nl of wlanint.split("\n")) {
    if (nl.includes("inet")) {
      const ipv4 = nl.match(/\d+\.\d+\.\d+\.\d+/);
      if (ipv4) return ipv4[0];
      console.log("'inet' found but no valid IPv4 address.");
      throw new Error(`Unable to find WLAN IPv4. Line: ${nl}`);
    }
  }

  console.log("Finished parsing but no IPv4 address was found.");
  throw new Error("No IPv4 address found for wlan0");
}

async function scanIP(wlanipv4: string): Promise<Array<PingRes>>{
  console.log(`Starting network scan for devices on the subnet ${wlanipv4}...`);
  let promises: Array<Promise<any>> = [];
  let res: Array<PingRes> = [];
  const subnet: string = wlanipv4.slice(void 0, wlanipv4.lastIndexOf(".") + 1);
  for (let i = 1; i <= 254; i++){
    const start: number = performance.now();
    const ip: string = subnet + i;
    promises.push(ping.promise.probe(ip).then(({ alive }) => {
      const end: number = performance.now();
      if (alive) res.push({ ip, took: +(end / start).toFixed(2) });
    }))
  }
  await Promise.all(promises);
  return res.filter(({ ip }) => { return ip !== wlanipv4 });
}

async function main(): Promise<void>{
  try{
    const start: number = performance.now();
    const ipv4 = getWlanIp();
    const devices = await scanIP(ipv4);
    const end: number = performance.now();
    if (devices.length > 0) {
      console.log(`${devices.length} devices found on the network. took ${(end / start).toFixed(2)} ms`);
      console.log("List of connected devices:");
      devices.forEach((device) => console.log(`- ${device.ip} took ${device.took} ms`));
    } else {
      console.log("No other devices found on the network.");
    }   
  } catch(e){
    console.log(`Error: ${e.message}`);
    process.exit(1);
  }
}

main()
