import subprocess
import re
import netifaces
from sys import platform

cached_network_interface_dict = None

def get_ifconfig(from_cache=False):
    global cached_network_interface_dict
    if from_cache and cached_network_interface_dict:
        return cached_network_interface_dict
    
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
