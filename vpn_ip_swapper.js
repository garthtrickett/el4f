const {
  AttachStaticIpCommand,
  GetStaticIpCommand,
  LightsailClient,
  AllocateStaticIpCommand,
  DetachStaticIpCommand,
  ReleaseStaticIpCommand,
} = require("@aws-sdk/client-lightsail");

const execSync = require("child_process").execSync;

const fs = require("fs");

let rawdata = fs.readFileSync("apikey.json");
let apikey = JSON.parse(rawdata);

async function get_static_ip() {
  execSync("nmcli --show-secrets --ask connection down wg0", {
    encoding: "utf-8",
  }); // the default is 'buffer'
  execSync("nmcli connection delete wg0", { encoding: "utf-8" }); // the default is 'buffer'
  var client = new LightsailClient({
    region: "ap-southeast-2",
    credentials: {
      accessKeyId: apikey.accessKeyId,
      secretAccessKey: apikey.secretAccessKey,
    },
  });
  var input = {
    // GetStaticIpRequest
    staticIpName: "StaticIp-1", // required
  };
  var command = new DetachStaticIpCommand(input);
  var response = await client.send(command);

  command = new ReleaseStaticIpCommand(input);
  response = await client.send(command);

  command = new AllocateStaticIpCommand(input);
  response = await client.send(command);

  command = new GetStaticIpCommand(input);
  response = await client.send(command);

  var ip = response["staticIp"]["ipAddress"];

  input = {
    // AttachStaticIpRequest
    staticIpName: "StaticIp-1", // required
    instanceName: "vpn", // required
  };
  command = new AttachStaticIpCommand(input);
  response = await client.send(command);

  var command_string_left = "sudo sed -i '/Endpoint/cEndpoint = ";
  var command_string_right = ":51820' /etc/wireguard/wg0.conf";
  var joined_command_string = command_string_left
    .concat(ip)
    .concat(command_string_right);
  console.log(joined_command_string);

  execSync(joined_command_string, { encoding: "utf-8" }); // the default is 'buffer'
  execSync(
    'sudo nmcli connection import type wireguard file "/etc/wireguard/wg0.conf"',
    { encoding: "utf-8" },
  ); // the default is 'buffer'

  return "finished";
}

module.exports = { get_static_ip };
