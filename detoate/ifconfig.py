import subprocess
import re
from sys import platform


class IfconfigPattern:
    """
    Class containing a pair of regex and the fields the regex maps to.

    First regex element to key[0], second to key[1] etc
    All selections must be binded to a key name
    """
    
    def __init__(self, key_names, regex_string):
        self.key_names = key_names
        self.regex_string = regex_string

    def get_dict(self, network_interface_description_string):
        """
        Extract the corresponding key-values from the network interface description from the shell ifconfig
        """
        attributes = {}
        regex_search = re.search(self.regex_string, network_interface_description_string)

        # Check if the regex_search is not empty
        if regex_search:
            # Map each key_name to the respective regex group
            # The number of key_names is the same as the number of regex_search groups - mandatory
            for key_iterator in range(len(self.key_names)):
                attributes[self.key_names[key_iterator]] = regex_search.group(key_iterator + 1).strip()

        return attributes


# Static array of patterns
patterns = [
    # Connection name + type
    IfconfigPattern(["name", "type", "mac"],
        "([:\w]+)\s+Link\s+encap:([A-z]*)\s+HWaddr\s+([A-z0-9:]*).*"),

    # Connection name + type, if type is Local(mac addr is not supported)
    IfconfigPattern(["name", "type"],
        "([A-z]+)\s+Link\s+encap:Local\s+([A-z]+)"),

    # Get ip + broadcast + netmask
    # Bcast is not present on Local Loopback, we need to split the regex for it
    IfconfigPattern(["broadcast"],
        "Bcast:([0-9.]+)"),

    IfconfigPattern(["ip"],
        "inet addr:([0-9.]+)"),

    IfconfigPattern(["netmask"],
        "Mask:([0-9.]+)"),

    # Get ipv6 addr for global, site, link, host
    IfconfigPattern(["ip6global"],
        "inet6\s+addr:\s+([0-9:A-z/]+)\s+Scope:Global"),

    IfconfigPattern(["ip6site"],
        "inet6\s+addr:\s+([0-9:A-z/]+)\s+Scope:Site"),

    IfconfigPattern(["ip6link"],
        "inet6\s+addr:\s+([0-9:A-z/]+)\s+Scope:Link"),

    IfconfigPattern(["ip6host"],
        "inet6\s+addr:\s+([0-9:A-z/]+)\s+Scope:Host"),

    # Connection status (UP, BROADCAST, RUNNING, MULTICAST)
    IfconfigPattern(["flags"],
        "\s+([A-z ]+)\s+MTU:"),

    IfconfigPattern(["mtu", "metric"],
        "MTU:([0-9.]+).*Metric:([0-9.]+)"),

    # RX elements, always on the same line
    IfconfigPattern(["rx_packets", "rx_errors", "rx_dropped", "rx_overruns", "rx_frame"],
        "RX packets:([0-9.]+).*errors:([0-9.]+).*dropped:([0-9.]+).*overruns:([0-9.]+).*frame:([0-9.]+)"),

    # TX elements, always on the same line
    IfconfigPattern(["tx_packets", "tx_errors", "tx_dropped", "tx_overruns", "tx_carrier"],
        "TX packets:([0-9.]+).*errors:([0-9.]+).*dropped:([0-9.]+).*overruns:([0-9.]+).*carrier:([0-9.]+)"),

    # RX and TX bytes
    IfconfigPattern(["rx_bytes", "tx_bytes"],
        "RX bytes:([0-9.]+).*TX bytes:([0-9.]+)"),

    # Interrupt errors (Optional)
    IfconfigPattern(["interrupt"],
        "Interrupt:(.*)"),

    IfconfigPattern(["collisions", "tx_queue_length"],
        "collisions:([0-9]+)\s+txqueuelen:([0-9]+)")
]

cached_network_interface_dict = None


def get_ifconfig(from_cache=False):
    """
    Function to return a dictionary of network interface attributes.
    :param from_cache: If true and if we have a previously cached value, we'll return that one
    """
    global cached_network_interface_dict
    global patterns

    if platform == "darwin":
        return {
            "eth0": {
                "mac": "CA:CA",
                "ip": "localhost",
            }
        }

    if from_cache and cached_network_interface_dict:
        return cached_network_interface_dict

    # Run the ifconfig command in a shell and return a byte array 
    ifconfig_command_output = subprocess.check_output("ifconfig", shell=True).decode("utf-8").strip()
 
    # Dictionary in which we'll collect and return all network interfaces in format {"network_interface_name" : property_dictionary}
    network_interface_dict = {}

    # Split all network interface descriptions (eg. eth0)
    # ifconfig puts an empty line between network interfaces
    for network_interface_description_string in ifconfig_command_output.split("\n\n"):
        # Current network interface results
        network_interface_element = {}
        for regex_pattern in patterns:
            network_interface_element.update(regex_pattern.get_dict(network_interface_description_string))

        # network_interface_element["flags"] must be split and put into a set
        if network_interface_element["flags"]:
            flags_set = set()
            for flag in network_interface_element["flags"].split(' '):
                flags_set.add(flag)
            network_interface_element["flags"] = flags_set

        # Add current network_interface into return dictionary
        network_interface_dict[str(network_interface_element['name'])] = network_interface_element

    cached_network_interface_dict = network_interface_dict

    return network_interface_dict


def get_default_network_interface(from_cache=False, preffered_order=None):
    dict = get_ifconfig(from_cache)
    if preffered_order is None:
        preffered_order = ["eth0:1", "eth0", "wlan0", "eno16777736"]

    for network_interface in preffered_order:
        if network_interface in dict:
            return dict[network_interface]

    for network_name in dict.keys():
        if network_name != "lo": return dict[network_name]

    print("Haha it's gonna fail! TODO IS UP TO YOU!")
    return list(dict.values())[0]