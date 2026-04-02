import List "mo:core/List";
import Time "mo:core/Time";
import Array "mo:base/Array";

actor {

  // ---- IC Management Canister HTTP Types ----

  type HttpHeader = { name : Text; value : Text };

  type HttpResponse = {
    status : Nat;
    headers : [HttpHeader];
    body : Blob;
  };

  type HttpRequestArgs = {
    url : Text;
    max_response_bytes : ?Nat64;
    method : { #get; #head; #post };
    headers : [HttpHeader];
    body : ?Blob;
    is_replicated : ?Bool;
  };

  let IC = actor "aaaaa-aa" : actor {
    http_request : HttpRequestArgs -> async HttpResponse;
  };

  // ---- App Types ----

  public type TopUpRequest = {
    uid : Text;
    packageId : Text;
    packageName : Text;
    amount : Nat;
    paymentMethod : Text;
  };

  public type TopUpResult = {
    success : Bool;
    transactionId : Text;
    message : Text;
    timestamp : Int;
  };

  public type TopUpRecord = {
    id : Text;
    uid : Text;
    packageId : Text;
    packageName : Text;
    amount : Nat;
    paymentMethod : Text;
    success : Bool;
    transactionId : Text;
    message : Text;
    timestamp : Int;
  };

  public type ApiConfig = {
    isConfigured : Bool;
    provider : Text;
  };

  public type ManualOrder = {
    id : Text;
    playerUID : Text;
    packageName : Text;
    priceNPR : Nat;
    screenshotData : Text;
    status : Text;
    timestamp : Int;
  };

  // ---- State ----

  var apiKey : Text = "";
  var apiBaseUrl : Text = "";
  var apiProvider : Text = "";
  let history = List.empty<TopUpRecord>();
  var orderCounter : Nat = 0;

  // Manual orders — stable array (Buffer is non-stable)
  stable var manualOrdersArray : [ManualOrder] = [];
  var manualOrderCounter : Nat = 0;

  // ---- Admin: API Config ----

  public shared func setApiConfig(key : Text, baseUrl : Text, provider : Text) : async () {
    apiKey := key;
    apiBaseUrl := baseUrl;
    apiProvider := provider;
  };

  public query func getApiConfig() : async ApiConfig {
    {
      isConfigured = apiKey != "" and apiBaseUrl != "";
      provider = apiProvider;
    };
  };

  // ---- Top-Up Processing ----

  public shared func processTopUp(request : TopUpRequest) : async TopUpResult {
    let timestamp = Time.now();
    orderCounter += 1;
    let orderId = "TXN" # orderCounter.toText() # timestamp.toText();

    var result : TopUpResult = {
      success = false;
      transactionId = orderId;
      message = "Processing failed";
      timestamp = timestamp;
    };

    if (apiKey == "" or apiBaseUrl == "") {
      result := {
        success = true;
        transactionId = "SIM-" # orderId;
        message = "[SIMULATION] Top-up successful. Configure API for live processing.";
        timestamp = timestamp;
      };
    } else {
      let bodyText = "{\"uid\":\"" # request.uid #
        "\",\"packageId\":\"" # request.packageId #
        "\",\"amount\":" # request.amount.toText() #
        ",\"apiKey\":\"" # apiKey # "\"}"
      ;

      let httpArgs : HttpRequestArgs = {
        url = apiBaseUrl # "/topup";
        max_response_bytes = ?(2000 : Nat64);
        method = #post;
        headers = [
          { name = "Content-Type"; value = "application/json" },
          { name = "Accept"; value = "application/json" },
        ];
        body = ?bodyText.encodeUtf8();
        is_replicated = null;
      };

      try {
        let response = await IC.http_request(httpArgs);
        if (response.status == 200) {
          result := {
            success = true;
            transactionId = orderId;
            message = "Top-up delivered successfully.";
            timestamp = timestamp;
          };
        } else {
          result := {
            success = false;
            transactionId = orderId;
            message = "API error: " # response.status.toText();
            timestamp = timestamp;
          };
        };
      } catch (_) {
        result := {
          success = false;
          transactionId = orderId;
          message = "Failed to reach top-up provider. Check API configuration.";
          timestamp = timestamp;
        };
      };
    };

    let record : TopUpRecord = {
      id = orderId;
      uid = request.uid;
      packageId = request.packageId;
      packageName = request.packageName;
      amount = request.amount;
      paymentMethod = request.paymentMethod;
      success = result.success;
      transactionId = result.transactionId;
      message = result.message;
      timestamp = result.timestamp;
    };
    history.add(record);

    result;
  };

  // ---- History ----

  // Returns all top-up history (no Nat subtraction needed)
  public query func getTopUpHistory() : async [TopUpRecord] {
    history.toArray();
  };

  // ---- Manual Orders ----

  public shared func submitManualOrder(
    playerUID : Text,
    packageName : Text,
    priceNPR : Nat,
    screenshotData : Text
  ) : async Text {
    manualOrderCounter += 1;
    let id = "ORD-" # manualOrderCounter.toText();
    let order : ManualOrder = {
      id = id;
      playerUID = playerUID;
      packageName = packageName;
      priceNPR = priceNPR;
      screenshotData = screenshotData;
      status = "Pending";
      timestamp = Time.now();
    };
    manualOrdersArray := Array.append<ManualOrder>(manualOrdersArray, [order]);
    id
  };

  public query func getManualOrders() : async [ManualOrder] {
    manualOrdersArray
  };

  public shared func markOrderCompleted(orderId : Text) : async Bool {
    var found = false;
    manualOrdersArray := Array.map<ManualOrder, ManualOrder>(
      manualOrdersArray,
      func(o : ManualOrder) : ManualOrder {
        if (o.id == orderId) {
          found := true;
          {
            id = o.id;
            playerUID = o.playerUID;
            packageName = o.packageName;
            priceNPR = o.priceNPR;
            screenshotData = o.screenshotData;
            status = "Completed";
            timestamp = o.timestamp;
          }
        } else {
          o
        }
      }
    );
    found
  };

  // ---- Legacy ----

  public type TopUpOrderInput = {
    playerUID : Text;
    diamondAmount : Nat;
    priceNPR : Nat;
    paymentMethod : Text;
  };

  public type TopUpOrder = {
    playerUID : Text;
    diamondAmount : Nat;
    priceNPR : Nat;
    paymentMethod : Text;
    timestamp : Int;
  };

  let orders = List.empty<TopUpOrder>();

  public shared func createTopUpOrder(orderInput : TopUpOrderInput) : async () {
    let newOrder : TopUpOrder = {
      orderInput with
      timestamp = Time.now();
    };
    orders.add(newOrder);
  };

  public query func getAllOrders() : async [TopUpOrder] {
    orders.toArray();
  };
};
