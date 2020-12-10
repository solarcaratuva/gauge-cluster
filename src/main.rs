

use futures::{FutureExt, StreamExt};
use warp::{Filter, filters::ws};

use serde::{Serialize, Deserialize};
use serde_json::{Result, Value};

use tokio_socketcan::{CANSocket, CANFrame};
use tokio::sync::mpsc;


#[derive(Serialize, Deserialize, Debug)]
pub struct CANMessage {
    id: u32,
    err: u32,
    data: Vec<u8>,
}

fn parse_command(msg: &str) -> Result<()> {
    let v: Value = serde_json::from_str(msg)?;
    println!("Command {}", v["command"]);
    match v["command"] {
        //"connect" => connect_can_bus(),
        //"disconnect" => disconnect_can_bus(),
        _ => eprintln!("Unknown command {}", v["command"]),
    }
    Ok(())
}


async fn handle_websocket(ws: ws::WebSocket) {

    let (ws_tx, mut ws_rx) = ws.split();
    let (to_ws_tx, to_ws_rx) = mpsc::unbounded_channel();

    tokio::spawn(to_ws_rx.forward(ws_tx).map(|result| { 
        eprintln!("sending thing {:?}", result);
        if let Err(e) = result {
            eprintln!("websocket error: {:?}", e);
        }
    }));
            //send(serde_json::to_string(&frame).unwrap());

    tokio::spawn(async move {
         while let Some(result) = ws_rx.next().await {
            let msg = match result {
                Ok(msg) => msg,
                Err(e) => {
                    eprintln!("websocket error {}", e);
                    break;
                },
            };
            parse_command(msg.to_str().unwrap());
        }
    });

    let mut socket = CANSocket::open("vcan0").unwrap();
    println!("Initialized CAN interface vcan0");
    while let Some(Ok(frame)) = socket.next().await {
        let frame_obj = CANMessage {
            id: frame.id(),
            err: frame.err(),
            data: frame.data().to_vec(),
        };
        let frame_to_str = serde_json::to_string(&frame_obj).unwrap();
        eprintln!("frame_to_str: {:?}", frame_to_str);
        let ws_message = ws::Message::text(frame_to_str);
        //eprintln!("ws_message: {:?}", ws_message);
        to_ws_tx.send(Ok(ws_message));
    }

}


#[tokio::main]
async fn main() {
    pretty_env_logger::init();
    //let (to_can_bus_tx, to_can_bus_rx) = tokio::sync::mpsc::unbounded_channel();

    let routes = warp::path("test")
            .and(warp::ws())
            .map(
                move |ws: warp::ws::Ws| {
                    ws.on_upgrade(|websocket| handle_websocket(websocket))
                },
            );
    
    warp::serve(routes).run(([127, 0, 0, 1], 8080)).await;
}
