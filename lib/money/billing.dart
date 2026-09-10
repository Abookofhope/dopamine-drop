import 'dart:async';

/// What the player can buy. One item, deliberately.
///
/// No subscription: a subscription on a game like this creates support load,
/// refund handling and churn management — the opposite of passive. Rewarded ads
/// stay available after the purchase, because a player who paid to remove ads
/// still often wants the extra time and that is the highest-value inventory.
enum Product { removeAds }

const removeAdsProductId = 'dd_remove_ads';

/// Purchase surface the game codes against.
///
/// Same shape as [Ads]: the store SDK stays behind an interface so the rest of
/// the game — and every test — never touches it.
abstract interface class Billing {
  Future<void> init();

  /// Localised price string for the storefront, or null before it loads.
  String? priceOf(Product product);

  bool owns(Product product);

  /// Returns true once the purchase is confirmed and acknowledged.
  Future<bool> buy(Product product);

  /// Play requires a visible restore path even though entitlements re-sync
  /// automatically; a player who reinstalls will look for the button.
  Future<void> restore();

  Stream<Product> get purchases;

  void dispose();
}

/// Used in tests, in dev, and on any build without the store plugin attached.
class NoBilling implements Billing {
  NoBilling({Set<Product>? owned}) : _owned = owned ?? <Product>{};

  final Set<Product> _owned;
  final StreamController<Product> _controller = StreamController.broadcast();

  @override
  Future<void> init() async {}

  @override
  String? priceOf(Product product) => null;

  @override
  bool owns(Product product) => _owned.contains(product);

  @override
  Future<bool> buy(Product product) async {
    _owned.add(product);
    _controller.add(product);
    return true;
  }

  @override
  Future<void> restore() async {}

  @override
  Stream<Product> get purchases => _controller.stream;

  @override
  void dispose() => _controller.close();
}
