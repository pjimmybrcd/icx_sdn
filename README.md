# icx_sdn

This project is a simple implementation of rerouting traffic flowing through an ICX 7750 using OpenFlow and SDN. It is a web based project that takes advantage of configuring flows via REST API calls to the controller. The traffic that needs to be rerouted first matches based on IP address and TCP ports 80 and 443, it then get redirected to a loopback port, and then from the loopback port, the traffic gets rerouted again to the proxy by updating the ouput port and destination MAC address.

In the current configuration, the user will need to enter the credentials of the SDN Controller, select an ICX Switch, and finally type in the IP Address and the Ingress port on the ICX of the traffic that needs to be rerouted to a proxy.

In the javascript file, index.js, there is a map containing information about the switches and each of their proxies and loopback ports. This information is used in creating flows and will need to be updated based on the network. The keys must remain the same, but the values may be changed.