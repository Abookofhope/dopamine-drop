import 'package:dopamine_drop/modes/rewire.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('pipe rotation', () {
    // N=1, E=2, S=4, W=8. One clockwise quarter turn is a one-bit rotate-left.
    test('a single opening walks around the compass', () {
      expect(rotateMask(1, 1), 2);
      expect(rotateMask(2, 1), 4);
      expect(rotateMask(4, 1), 8);
      expect(rotateMask(8, 1), 1);
    });

    test('four turns is the identity', () {
      for (var mask = 0; mask < 16; mask++) {
        expect(rotateMask(mask, 4), mask);
      }
    });

    test('a straight piece is symmetric under a half turn', () {
      expect(rotateMask(5, 2), 5); // north-south
      expect(rotateMask(10, 2), 10); // east-west
    });

    test('an elbow is not symmetric under a half turn', () {
      expect(rotateMask(3, 2), isNot(3)); // north-east
    });

    test('rotation never adds or drops an opening', () {
      int bits(int m) => m.toRadixString(2).split('').where((c) => c == '1').length;
      for (var mask = 0; mask < 16; mask++) {
        for (var turns = 0; turns < 8; turns++) {
          expect(bits(rotateMask(mask, turns)), bits(mask));
        }
      }
    });
  });
}
