from typing import Optional, Any

import netifaces


def get_ifconfig() -> dict[str, dict]:
    network_interface_dict = {}
    for interface_name in netifaces.interfaces():
        current_network = dict()
        addrs = netifaces.ifaddresses(interface_name)

        try:
            current_network["mac"] = addrs[netifaces.AF_LINK][0]["addr"]
        except:
            current_network["mac"] = "00:00:00:00"

        try:
            current_network["ip"] = addrs[netifaces.AF_INET][0]["addr"]
        except:
            current_network["ip"] = "00:00:00:00"

        try:
            current_network["ipv6"] = addrs[netifaces.AF_INET6][0]["addr"]
        except:
            current_network["ipv6"] = "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00"

        network_interface_dict[interface_name] = current_network

    return network_interface_dict


def get_private_ip() -> Optional[str]:
    network_info = get_ifconfig()
    for network_name, info in network_info.items():
        if info["ip"].startswith("10."):
            return info["ip"]
    return None


def get_default_network_interface() -> dict[str, Any]:
    ip_config = get_ifconfig()

    preferred_order = ["eth0:1", "eth0", "wlan0", "eno16777736"]

    for network_interface in preferred_order:
        if network_interface in ip_config:
            return ip_config[network_interface]

    for network_name in ip_config.keys():
        if network_name != "lo":
            return ip_config[network_name]

    print("Haha it's gonna fail! TODO IS UP TO YOU!")
    return list(ip_config.values())[0]
