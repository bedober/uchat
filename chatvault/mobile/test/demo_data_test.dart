import 'package:flutter_test/flutter_test.dart';
import 'package:chatvault/data/demo_data.dart';

void main() {
  test('preview contains requested sample counts', () {
    expect(demoChats, hasLength(10));
    expect(demoGroups, hasLength(3));
    expect(demoGroups.first.members, 5000);
    expect(demoChannels, hasLength(2));
  });
}
