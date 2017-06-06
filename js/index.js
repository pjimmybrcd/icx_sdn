var flowID = null;
var namePrefix = "flow";

//This is the main config for the network.
var config = {
               "switches":[
                  {
                     "ipv4":"10.130.33.128",
                     "openflow_name":"openflow:106225800878336",
                     "proxy":{
                        "loopback_port_source":"15",
                        "loopback_port_destination":"16",
                        "switch_port":"19",
                        "mac":"00:0c:29:70:f5:a4"
                     }
                  }
               ]
            };


$(document).ready(function(){
    console.log("Page Loaded");

    $(document).ready(function() {
        $('select').material_select();
    });

    setup_page();
    set_event_listeners();
});

function setup_page(){
    var select_switch_html = '<option value="" disabled selected>Select the Switch</option>';
    for(var i=0; i<config["switches"].length; i++){
        //console.log(config["switches"][i]["ipv4"]);
        var ip_addr = config["switches"][i]["ipv4"];
        select_switch_html = select_switch_html + '<option value="'+ ip_addr +'">'+ ip_addr +'</option>';
    }

    $("#select_switch_ip").html(select_switch_html);

}

function set_event_listeners(){
    console.log("Setting Event Listeners");

    document.getElementById('button_add_flow').addEventListener('click', function() {
        add_flow_button_pressed();
    });

    document.getElementById('button_delete_all_flows').addEventListener('click', function() {
        delete_all_flows_button_pressed();
    });

    $("#select_switch_ip").on('change', function() {
        var of_switch_ip = $("#select_switch_ip").val();
        var matched_proxy = null;
        for(var i=0; i<config["switches"].length; i++){
            if(config["switches"][i]["ipv4"] == of_switch_ip){
                matched_proxy = config["switches"][i]["proxy"];
                break;
            }
        }

        if(matched_proxy != null){
            // clear contents of dropdown
            var $select_mac_dropdown = $("#select_destination_mac").empty().html(' ');
            var $select_updated_vlan_dropdown = $("#select_updated_vlan").empty().html(' ');
            var $select_output_port = $("#select_output_port").empty().html(' ');

            // add new value
            $select_mac_dropdown.append($("<option></option>").attr("value", matched_proxy["mac"]).text(matched_proxy["mac"]));
            $select_updated_vlan_dropdown.append($("<option></option>").attr("value", matched_proxy["vlan"]).text(matched_proxy["vlan"]));
            $select_output_port.append($("<option></option>").attr("value", matched_proxy["loopback_port_source"]).text(matched_proxy["loopback_port_source"]));

            $("#select_destination_mac").material_select();
            $("#select_updated_vlan").material_select();
            $("#select_output_port").material_select();
        }
    });
}

function if_credentials_not_null(username, password) {
    if (username != null && password != null && username != ''
            && password != '') {
        return true;
    }
    return false;
}

function get_of_switch_info(of_switch_ip){
    var match = null;
    if(config["switches"]){
        for(var i=0; i<config["switches"].length; i++){
            if(config["switches"][i]["ipv4"] == of_switch_ip){
                match = config["switches"][i]
            }
        }
    }
    return match
}

function set_flow_id_and_check_loopback_flows(sdn_controller_ip, sdn_controller_port, sdn_controller_username, sdn_controller_password, of_switch_name){
    console.log("get_flow_id");
    
    var base64EncodedPassword = "Basic "
            + btoa(sdn_controller_username + ":" + sdn_controller_password);

    if (of_switch_name==null || !if_credentials_not_null(sdn_controller_username, sdn_controller_password)) {
        alert("Invalid Information.");
        return;
    }

    var ids = [];
    var loopback_flow_present = false;
    $.ajax({
        url: "http://" + sdn_controller_ip + ":" + sdn_controller_port + "/restconf/config/opendaylight-inventory:nodes/node/" + of_switch_name + "/table/0",
        type: 'GET',
        timeout: 5000,
        async: false,
        success: function (result) {
            console.log("success", result);
            var flows = result["flow-node-inventory:table"]["0"]["flow"];
            if(flows){
                for (var i = 0; i< flows.length; i++){
                    //console.log(flows[i]);
                    ids.push(flows[i]["id"]);
                    if(flows[i]["flow-name"].startsWith("loopback_flow")){
                        loopback_flow_present = true;
                    }
                }
            }

            if(ids.length>0){
                ids.sort();
                flowID = ids[ids.length-1];
            } else {
                flowID = 1;
            }
        },
        error: function (error) {
            console.log(error);
            alert(error.statusText);
        },
        beforeSend : function(xhr) {
            xhr.setRequestHeader("Authorization", base64EncodedPassword);
        }
    });

    return loopback_flow_present;
}


function send_flow_to_controller(sdn_controller_ip, sdn_controller_port, sdn_controller_username, sdn_controller_password, of_switch_name, flow_number, body){
    //Sends the flow to the SDN Controller
    var base64EncodedPassword = "Basic "
            + btoa(sdn_controller_username + ":" + sdn_controller_password);

    $.ajax({
        url: "http://" + sdn_controller_ip + ":" + sdn_controller_port + "/restconf/config/opendaylight-inventory:nodes/node/" + of_switch_name + "/table/0/flow/" + flow_number,
        type: 'put',
        contentType: "application/json",
        timeout: 5000,
        data: JSON.stringify(body),
        success: function (result) {
            console.log("success", result);
            Materialize.toast(result, 2000, 'rounded')
        },
        error: function (error) {
            console.log(error);
            alert(error.statusText);
            Materialize.toast(error, 2000, 'rounded')
        },
        beforeSend : function(xhr) {
            xhr.setRequestHeader("Authorization", base64EncodedPassword);
        }
    });
}


function add_flow_button_pressed(){
    console.log("add_flow_button_pressed");

    var sdn_controller_ip = $("#input_ip_controller").val();
    var sdn_controller_port = $("#input_port_controller").val();
    var sdn_controller_username = $("#input_username_controller").val();
    var sdn_controller_password = $("#input_password_controller").val();
    var of_switch_ip = $("#select_switch_ip").val();

    var network_switch = get_of_switch_info(of_switch_ip);

    if (network_switch==null || !if_credentials_not_null(sdn_controller_username, sdn_controller_password)) {
        alert("Invalid Information.");
        return;
    }

    var of_switch_name = network_switch["openflow_name"];
    var loopback_port_source = network_switch["proxy"]["loopback_port_source"];
    var loopback_port_destination = network_switch["proxy"]["loopback_port_destination"];
    var proxy_switch_port = network_switch["proxy"]["switch_port"];
    var proxy_mac = network_switch["proxy"]["mac"];

    var switch_ip = $("#select_switch").val();
    var user_in_port = $("#input_user_in_port").val();
    var ip_subnet = $("#ip_subnet").val();
    var ingress_vlan = $("#select_ingress_vlan").val();
    var destination_mac = $("#select_destination_mac").val();
    var output_port = $("#select_output_port").val();
    var updated_vlan = $("#input_vlan").val();

    //INPUT SANITIZATION
    if(!/^\d+/.test(user_in_port)){
        alert("Please enter a user traffic input port for the switch.");
        return;
    }

    var result_ipv4 = /^\d+\.\d+\.\d+\.\d+\/\d+/.test(ip_subnet);
    var result_ipv6 = /^([\da-fA-f]{4})?:([\da-fA-f]{4})?:([\da-fA-f]{4})?:([\da-fA-f]{4})?:([\da-fA-f]{4})?:([\da-fA-f]{4})?:([\da-fA-f]{4})?:([\da-fA-f]{4})?([\da-fA-f]{4})?\/\d+/.test(ip_subnet);
    
    if(!result_ipv4 && !result_ipv6){
        alert("Please enter a valid IP Subnet.");
        return;
    }

    var loopback_flow_present = set_flow_id_and_check_loopback_flows(sdn_controller_ip, sdn_controller_port, sdn_controller_username, sdn_controller_password, of_switch_name);
    
    var flow_number = parseInt(flowID) + 1;

    //Add the Loopback flows if not already present.
    if(!loopback_flow_present){
        var flows = create_loopback_flows(flow_number, of_switch_name, loopback_port_destination, proxy_switch_port, proxy_mac);
        for(var i=0; i<flows.length; i++){
            var body = flows[i];
            send_flow_to_controller(sdn_controller_ip, sdn_controller_port, sdn_controller_username, sdn_controller_password, of_switch_name, flow_number, body);
            flow_number = flow_number + 1;
        }
    }

    if(result_ipv4){
        // If it is a valid IPv4 matching address
        var flows = create_ipv4_json_flows(flow_number, of_switch_name, ip_subnet, loopback_port_source, user_in_port);
        for(var i=0; i<flows.length; i++){
            var body = flows[i];
            send_flow_to_controller(sdn_controller_ip, sdn_controller_port, sdn_controller_username, sdn_controller_password, of_switch_name, flow_number, body);
            flow_number = flow_number + 1;
        }
    } else {
        // If it is a valid IPv6 matching address
        var flows = create_ipv6_json_flows(flow_number, of_switch_name, ip_subnet, loopback_port_source, user_in_port);
        for(var i=0; i<flows.length; i++){
            var body = flows[i];
            send_flow_to_controller(sdn_controller_ip, sdn_controller_port, sdn_controller_username, sdn_controller_password, of_switch_name, flow_number, body);
            flow_number = flow_number + 1;
        }
    }
}


function create_loopback_flows(flow_number, of_switch_name, loopback_port_destination, proxy_switch_port, proxy_mac){
    //This function creates the loopback flows.
    var flows = [];

    var loopback_to_proxy_ipv4 = {
                   "flow-node-inventory:flow":[
                      {
                         "id":flow_number,
                         "priority":2,
                         "flow-name":"loopback_flow_ipv4",
                         "table_id":0,
                         "idle-timeout":0,
                         "hard-timeout":0,
                         "instructions":{
                            "instruction":[
                               {
                                  "order":0,
                                  "apply-actions":{
                                     "action":[
                                        {
                                           "order":19,
                                           "output-action":{
                                              "output-node-connector": of_switch_name + ":" + proxy_switch_port
                                           }
                                        },
                                        {
                                           "order":0,
                                           "set-field":{
                                              "ethernet-match":{
                                                 "ethernet-destination":{
                                                    "address": proxy_mac
                                                 }
                                              }
                                           }
                                        }
                                     ]
                                  }
                               }
                            ]
                         },
                         "match":{
                            "ethernet-match":{
                               "ethernet-type":{
                                  "type":2048
                               }
                            },
                            "vlan-match":{
                               "vlan-id":{
                                  "vlan-id-present":false
                               }
                            },
                            "in-port": of_switch_name + ":" + loopback_port_destination
                         }
                      }
                   ]
                };

    flow_number = flow_number + 1;

    var loopback_to_proxy_ipv6 = {
                   "flow-node-inventory:flow":[
                      {
                         "id":flow_number,
                         "priority":2,
                         "flow-name":"loopback_flow_ipv6",
                         "table_id":0,
                         "idle-timeout":0,
                         "hard-timeout":0,
                         "instructions":{
                            "instruction":[
                               {
                                  "order":0,
                                  "apply-actions":{
                                     "action":[
                                        {
                                           "order":19,
                                           "output-action":{
                                              "output-node-connector": of_switch_name + ":" + proxy_switch_port
                                           }
                                        },
                                        {
                                           "order":0,
                                           "set-field":{
                                              "ethernet-match":{
                                                 "ethernet-destination":{
                                                    "address": proxy_mac
                                                 }
                                              }
                                           }
                                        }
                                     ]
                                  }
                               }
                            ]
                         },
                         "match":{
                            "ethernet-match":{
                               "ethernet-type":{
                                  "type":34525
                               }
                            },
                            "vlan-match":{
                               "vlan-id":{
                                  "vlan-id-present":false
                               }
                            },
                            "in-port": of_switch_name + ":" + loopback_port_destination
                         }
                      }
                   ]
                };
    
    flows.push(loopback_to_proxy_ipv4);
    flows.push(loopback_to_proxy_ipv6);

    return flows;
}


function create_ipv4_json_flows(flow_number, of_switch_name, ip_subnet, of_switch_proxy_port, input_port){
    //This function will create the ipv4 redirect flows.

    var flows = [];

    var body_tcp_80 = {
                  "flow-node-inventory:flow": [
                    {
                      "id": flow_number,
                      "priority": 2,
                      "flow-name": "flow"+flow_number,
                      "table_id": 0,
                      "idle-timeout": 0,
                      "hard-timeout": 0,
                      "instructions": {
                        "instruction": [
                          {
                            "order": 0,
                            "apply-actions": {
                              "action": [
                                {
                                  "order": 0,
                                  "output-action": {
                                    "output-node-connector": of_switch_name + ":" + of_switch_proxy_port
                                  }
                                }
                              ]
                            }
                          }
                        ]
                      },
                      "match": {
                        "ipv4-source": ip_subnet,
                        "in-port": of_switch_name + ":" + input_port,
                        "ethernet-match": {
                          "ethernet-type": {
                            "type": 2048
                          }
                        },
                        "ip-match":{
                            "ip-protocol":6
                        },
                        "vlan-match":{
                            "vlan-id":{
                                "vlan-id-present":false
                            }
                        },
                        "tcp-destination-port":80
                      }
                    }
                  ]
                };

    flow_number = flow_number + 1;

    var body_tcp_443 = {
                  "flow-node-inventory:flow": [
                    {
                      "id": flow_number,
                      "priority": 2,
                      "flow-name": "flow"+flow_number,
                      "table_id": 0,
                      "idle-timeout": 0,
                      "hard-timeout": 0,
                      "instructions": {
                        "instruction": [
                          {
                            "order": 0,
                            "apply-actions": {
                              "action": [
                                {
                                  "order": 0,
                                  "output-action": {
                                    "output-node-connector": of_switch_name + ":" + of_switch_proxy_port
                                  }
                                }
                              ]
                            }
                          }
                        ]
                      },
                      "match": {
                        "ipv4-source": ip_subnet,
                        "in-port": of_switch_name + ":" + input_port,
                        "ethernet-match": {
                          "ethernet-type": {
                            "type": 2048
                          }
                        },
                        "ip-match":{
                            "ip-protocol":6
                        },
                        "vlan-match":{
                            "vlan-id":{
                                "vlan-id-present":false
                            }
                        },
                        "tcp-destination-port":443
                      }
                    }
                  ]
                };

    flows.push(body_tcp_80);
    flows.push(body_tcp_443);

    return flows;
}

function create_ipv6_json_flows(flow_number, of_switch_name, ip_subnet, of_switch_proxy_port, input_port){
    //This function will create the ipv6 redirect flows.

    var flows = [];

    var body_tcp_80 = {
                  "flow-node-inventory:flow": [
                    {
                      "id": flow_number,
                      "priority": 2,
                      "flow-name": "flow"+flow_number,
                      "table_id": 0,
                      "idle-timeout": 0,
                      "hard-timeout": 0,
                      "instructions": {
                        "instruction": [
                          {
                            "order": 0,
                            "apply-actions": {
                              "action": [
                                {
                                  "order": 0,
                                  "output-action": {
                                    "output-node-connector": of_switch_name + ":" + of_switch_proxy_port
                                  }
                                }
                              ]
                            }
                          }
                        ]
                      },
                      "match": {
                        "ipv6-source": ip_subnet,
                        "in-port": of_switch_name + ":" + input_port,
                        "ethernet-match": {
                          "ethernet-type": {
                            "type": 34525
                          }
                        },
                        "ip-match":{
                            "ip-protocol":6
                        },
                        "vlan-match":{
                            "vlan-id":{
                                "vlan-id-present":false
                            }
                        },
                        "tcp-source-port":80
                      }
                    }
                  ]
                };

    flow_number = flow_number + 1;

    var body_tcp_443 = {
                  "flow-node-inventory:flow": [
                    {
                      "id": flow_number,
                      "priority": 2,
                      "flow-name": "flow"+flow_number,
                      "table_id": 0,
                      "idle-timeout": 0,
                      "hard-timeout": 0,
                      "instructions": {
                        "instruction": [
                          {
                            "order": 0,
                            "apply-actions": {
                              "action": [
                                {
                                  "order": 0,
                                  "output-action": {
                                    "output-node-connector": of_switch_name + ":" + of_switch_proxy_port
                                  }
                                }
                              ]
                            }
                          }
                        ]
                      },
                      "match": {
                        "ipv6-source": ip_subnet,
                        "in-port": of_switch_name + ":" + input_port,
                        "ethernet-match": {
                          "ethernet-type": {
                            "type": 34525
                          }
                        },
                        "ip-match":{
                            "ip-protocol":6
                        },
                        "vlan-match":{
                            "vlan-id":{
                                "vlan-id-present":false
                            }
                        },
                        "tcp-source-port":443
                      }
                    }
                  ]
                };

    flows.push(body_tcp_80);
    flows.push(body_tcp_443);

    return flows;
}


function delete_all_flows_button_pressed(){
    //This function will delete all the flows on the switch.
    console.log("delete_all_flows_button_pressed");

    var sdn_controller_ip = $("#input_ip_controller").val();
    var sdn_controller_port = $("#input_port_controller").val();
    var sdn_controller_username = $("#input_username_controller").val();
    var sdn_controller_password = $("#input_password_controller").val();
    var of_switch_ip = $("#select_switch_ip").val();
    
    if (!confirm('Are you sure you want to delete all flows?')) {
        return;
    }

    var network_switch = get_of_switch_info(of_switch_ip);

    if (network_switch==null || !if_credentials_not_null(sdn_controller_username, sdn_controller_password)) {
        alert("Invalid Information.");
        return;
    }

    var of_switch_name = network_switch["openflow_name"];

    var base64EncodedPassword = "Basic "
            + btoa(sdn_controller_username + ":" + sdn_controller_password);

    $.ajax({
        url: "http://" + sdn_controller_ip + ":" + sdn_controller_port + "/restconf/config/opendaylight-inventory:nodes/node/" + of_switch_name + "/table/0",
        type: 'GET',
        timeout: 5000,
        async: false,
        success: function (result) {
            var flows = result["flow-node-inventory:table"]["0"]["flow"];
            if(flows){
                for (var i = 0; i< flows.length; i++){
                    var current_flow_id = flows[i]["id"];
                    $.ajax({
                        url: "http://" + sdn_controller_ip + ":" + sdn_controller_port + "/restconf/config/opendaylight-inventory:nodes/node/" + of_switch_name + "/table/0/flow/" + current_flow_id,
                        type: 'DELETE',
                        timeout: 5000,
                        async: false,
                        success: function (result) {
                            console.log("Deleted flowid:" + current_flow_id);
                        },
                        error: function (error) {
                            console.log(error);
                            alert(error.statusText);
                        },
                        beforeSend : function(xhr) {
                            xhr.setRequestHeader("Authorization", base64EncodedPassword);
                        }
                    });
                }
            }
        },
        error: function (error) {
            console.log(error);
            alert(error.statusText);
        },
        beforeSend : function(xhr) {
            xhr.setRequestHeader("Authorization", base64EncodedPassword);
        }
    });
}

// To delete flows

// function get_flows(){
//     console.log("get_flows");
//     // var sdn_controller_ip = $("#input_ip_controller").val();
//     // var sdn_controller_port = $("#input_port_controller").val();
//     // var sdn_controller_username = $("#input_username_controller").val();
//     // var sdn_controller_password = $("#input_password_controller").val();
//     // var of_switch_ip = $("#select_switch_ip").val();

//     var sdn_controller_ip = "10.130.33.127";
//     var sdn_controller_port = "8181";
//     var of_switch_ip = "192.168.1.1";
//     var sdn_controller_username = "admin";
//     var sdn_controller_password = "admin";


//     var base64EncodedPassword = "Basic "
//             + btoa(sdn_controller_username + ":" + sdn_controller_password);

//     var network_switch = get_of_switch_info(of_switch_ip);
//     var of_switch_name = network_switch["openflow_name"];

//     if (of_switch_name==null || !if_credentials_not_null(sdn_controller_username, sdn_controller_password)) {
//         alert("Invalid Information.");
//         return;
//     }

//     var flows = [];
//     $.ajax({
//         url: "http://" + sdn_controller_ip + ":" + sdn_controller_port + "/restconf/config/opendaylight-inventory:nodes/node/" + of_switch_name + "/table/0",
//         type: 'GET',
//         timeout: 5000,
//         async: false,
//         success: function (result) {
//             console.log("success", result);
//             flows = result["flow-node-inventory:table"]["0"]["flow"];
//         },
//         error: function (error) {
//             console.log(error);
//             alert(error.statusText);
//         },
//         beforeSend : function(xhr) {
//             xhr.setRequestHeader("Authorization", base64EncodedPassword);
//         }
//     });
//     return flows;
// }
// 
// function delete_flow_button_pressed(){
//     console.log("delete_flow_button_pressed");

//     var switch_ip = $("#select_switch").val();
//     var ip_subnet = $("#ip_subnet").val();
//     var ingress_vlan = $("#select_ingress_vlan").val();
//     var destination_mac = $("#select_destination_mac").val();
//     var updated_vlan = $("#select_updated_vlan").val();

//     console.log(switch_ip + ", " + ip_subnet + ", " + ingress_vlan + ", " + destination_mac + ", " + updated_vlan);

//     //INPUT SANITIZATION
//     var result = /^\d+\.\d+\.\d+\.\d+\/\d+/.test(ip_subnet);
//     if(!result){
//         alert("Please enter a valid IP Subnet.");
//         return;
//     }

//     //Get all flows, get flowids of the ones that matche, then delete those flows
//     var flows = get_flows();
//     console.log(flows);

//     var matching_id = "";
//     for (var i = 0; i< flows.length; i++){
//         console.log(flows[i]);
        
//     }

//     $.ajax({
//         url: sdnControllerURL + "restconf/config/opendaylight-inventory:nodes/node/"+of_switch+"/table/0",
//         type: 'GET',
//         timeout: 5000,
//         async: false,
//         success: function (result) {
//             console.log("success", result);
//             flows = result["flow-node-inventory:table"]["0"]["flow"];
//         },
//         error: function (error) {
//             console.log(error);
//             alert(error.statusText);
//         },
//         beforeSend : function(xhr) {
//             xhr.setRequestHeader("Authorization", base64EncodedPassword);
//         }
//     });
// }
