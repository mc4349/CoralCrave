// Type declarations for @paypal/checkout-server-sdk
declare module '@paypal/checkout-server-sdk' {
  export namespace core {
    class PayPalHttpClient {
      constructor(environment: Environment)
      execute(request: any): Promise<any>
    }

    class SandboxEnvironment {
      constructor(clientId: string, clientSecret: string)
    }

    class LiveEnvironment {
      constructor(clientId: string, clientSecret: string)
    }

    abstract class Environment {
      constructor(clientId: string, clientSecret: string)
    }
  }

  export namespace orders {
    class OrdersCaptureRequest {
      constructor(orderId: string)
      requestBody(body: any): void
    }

    class OrdersCreateRequest {
      prefer(preference: string): void
      requestBody(body: any): void
    }
  }
}
