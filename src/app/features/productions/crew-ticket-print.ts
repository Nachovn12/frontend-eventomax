import {
  CrewTicket,
  OrganizerResolutionSource,
  ProductionStatus,
  formatOrganizerDisplayLabel,
  isTechnicalOrganizerIdentifier,
} from '../../core/models/production.model';
import {
  formatOperationalTimestampChile,
  formatScheduledAtChile,
  formatUtcIsoSeconds,
  formatUtcReference,
  parseServerTimestampAsUtc as parseServerTimestampAsUtcCore,
} from '../../core/utils/chile-time';
import { EquipmentReservationItem } from '../catalog/models/equipment.model';
import { buildInternalTraceabilityQrSvg } from './crew-ticket-qr';

export interface CrewTicketPrintData {
  readonly ticket: CrewTicket;
  readonly crewName: string | null;
  readonly crewId: string | null;
  readonly currentCrewName?: string | null;
  readonly currentCrewId?: string | null;
  readonly directive: string;
  readonly statusLabel: string;
  readonly reservations: readonly EquipmentReservationItem[];
  readonly organizerId?: string | null;
  readonly organizerDisplayName?: string | null;
  readonly organizerResolutionSource?: OrganizerResolutionSource | null;
  readonly productionStatusLabel?: string | null;
  readonly productionStatusCode?: ProductionStatus | string | null;
  readonly productionUpdatedAt?: string | null;
  readonly productionQueriedAt?: string | null;
  readonly actorOwnerId?: string | null;
}

// Official EventoMax horizontal vector paths (public/branding/eventomax/logos/eventomax-logo-dark.svg)
const EVENTOMAX_LOGO_BLUE_PATH =
  'M273.09 157.81C271.12 162.66 272.32 170.12 272.28 175.5C272.21 185.83 272.24 196.17 272.26 206.5C272.27 211.37 271.4 217.34 272.85 221.96C252.13 232.81 231.41 243.65 210.7 254.5C213.29 257.26 216.91 258.44 220.26 260.25C227.69 264.25 235.32 267.8 242.81 271.66C265.76 283.5 288.39 296.13 311.58 307.5C311.55 327.58 311.53 347.65 311.5 367.73C277.83 350.02 244.17 332.31 210.5 314.61C208.09 321.81 208.93 343.25 209.66 351.5C243.61 370.21 277.55 388.92 311.5 407.63C311.5 429.59 311.5 451.56 311.5 473.52C257.83 442.76 204.17 412.01 150.5 381.25C148 370.78 149.9 358.3 149.8 347.5C149.6 323.5 149.83 299.5 149.82 275.5C149.81 263.5 149.72 251.5 149.79 239.5C149.83 233.75 149 227.46 150.5 221.92C158.74 215.94 168.66 211.95 177.63 207.15C199.11 195.63 220.93 184.57 242.22 172.7C249.53 168.62 256.97 164.75 264.41 160.9C267.1 159.51 270.28 156.79 273.09 157.81ZM415.91 308.24C418.13 303.61 416.76 295.78 416.74 290.5C416.71 280.17 416.8 269.83 416.81 259.5C416.81 254.29 417.63 247.99 416.13 243C422.33 241.74 430.61 235.95 436.21 232.66C447.59 225.97 459.37 219.98 470.73 213.24C504.02 193.5 539.01 176.67 572.5 157.28C572.5 232.22 572.5 307.16 572.5 382.09C551.25 393.56 529.99 405.03 508.74 416.5C507.16 404.49 508.42 391.63 508.37 379.5C508.28 354.5 508.24 329.5 508.4 304.5C508.46 295.17 508.38 285.83 508.4 276.5C508.41 270.92 509.05 264.89 507.5 259.6C485.55 272.76 462.3 283.99 439.91 296.42C434.34 299.51 428.72 302.53 423.15 305.63C420.79 306.95 418.49 309 415.91 308.24ZM1400.5 308.67C1404.45 304.99 1409.28 294.75 1412.15 289.66C1418.39 278.6 1425.03 267.78 1431.22 256.69C1433.42 252.75 1440.26 238.88 1443.45 236.93C1446.52 235.05 1452.02 236.03 1455.5 236.04C1464.98 236.06 1479.06 234.38 1487.89 236.5C1489.67 240.09 1489.07 244.47 1489.06 248.5C1489.03 255.5 1489.06 262.5 1489.04 269.5C1488.94 295.83 1489.08 322.17 1489.08 348.5C1489.07 356.5 1489.04 364.5 1489.03 372.5C1489.02 376.55 1489.71 380.96 1487.78 384.5C1480.43 386.13 1472.03 384.74 1464.5 384.74C1458.07 384.75 1450.94 385.95 1444.83 383.78C1444.83 359.88 1444.83 335.98 1444.83 312.08C1441.06 314.66 1439.17 320.23 1436.69 324.22C1431.3 332.89 1426.58 342 1421.15 350.66C1419.3 353.61 1417.79 359.4 1414.91 361.39C1411.6 363.68 1405.29 362.54 1401.5 362.55C1397.47 362.55 1390.54 363.63 1386.97 361.52C1384.51 360.07 1379.29 349.67 1377.75 346.73C1373.23 338.12 1368.25 329.63 1363.02 321.44C1361 318.28 1359.53 314.69 1356.91 312.15C1356.91 335.93 1356.91 359.72 1356.91 383.5C1350.26 386.61 1333.46 384.95 1325.5 384.92C1321.53 384.9 1317.16 385.59 1313.76 383.5C1311.68 375.61 1313.28 359.37 1313.21 350.5C1312.99 325.17 1313.36 299.83 1313.3 274.5C1313.28 265.83 1313.2 257.17 1313.17 248.5C1313.15 244.5 1312.45 240.12 1314.5 236.67C1322.63 234.38 1336.66 236.13 1345.5 236.08C1349.16 236.07 1354.53 234.92 1357.89 236.6C1361.36 238.32 1366.62 250.63 1369.03 254.44C1375.77 265.09 1382.17 276.17 1388.38 287.13C1392.44 294.29 1395.97 301.78 1400.5 308.67ZM1615.5 376.11C1620.85 372.51 1627.77 360.9 1631.69 355.22C1638.66 345.09 1646.65 335.62 1653.68 325.5C1652.11 321.15 1648.38 317.57 1645.71 313.76C1638.89 304.05 1631.54 294.6 1624.44 285.09C1620.81 280.23 1614.35 274.7 1614.21 268.5C1617.48 266.41 1621.71 267.12 1625.5 267.13C1633.83 267.15 1642.17 267.16 1650.5 267.13C1653.99 267.11 1659.22 266.17 1662.23 268.28C1664.79 270.06 1666.4 273.81 1668.15 276.32C1671.92 281.72 1675.79 287.91 1680.5 292.44C1684.99 287.17 1688.96 281.1 1692.96 275.43C1694.5 273.25 1695.89 270.18 1698.03 268.52C1700.94 266.27 1706.06 267.16 1709.5 267.14C1718.17 267.12 1726.83 267.1 1735.5 267.15C1739.18 267.18 1743.62 266.38 1746.72 268.5C1745.85 274.74 1738.63 281.2 1734.87 286.32C1725.49 299.08 1715.29 311.37 1706.46 324.5C1708.89 330.32 1713.97 335.68 1717.77 340.73C1723.66 348.55 1728.91 356.87 1734.93 364.59C1738.63 369.32 1746.54 377.77 1746.9 383.5C1743.42 385.71 1738.55 385.03 1734.5 384.99C1726.5 384.92 1718.5 384.95 1710.5 384.96C1707.14 384.96 1701.52 385.98 1698.72 383.81C1696.97 382.45 1695.67 379.94 1694.36 378.17C1689.74 371.92 1685.44 363.59 1679.5 358.69C1674.43 364.48 1670.27 371 1665.63 377.15C1664.07 379.21 1662.12 383.09 1659.84 384.34C1656.65 386.1 1641.96 384.93 1637.5 384.98C1623.17 385.14 1608.83 384.86 1594.5 384.88C1587.2 384.9 1578.57 386.17 1571.67 383.69C1571.67 380.96 1571.67 378.23 1571.67 375.5C1565.42 377.58 1560.38 383.14 1553.44 384.79C1528.91 390.6 1498.07 380.36 1496.64 351.5C1496.43 347.15 1496.82 342.76 1498.2 338.61C1504.87 318.63 1527.91 314.16 1546.5 314.16C1554.23 314.16 1563.8 315.64 1571.1 313.5C1569.17 293.03 1541.88 299.16 1529.15 304.61C1525.21 306.3 1521.16 309.48 1516.88 309.5C1513.19 305.58 1505.89 287.95 1505.32 282.5C1508.32 276.21 1523.23 271.28 1529.75 269.33C1555.8 261.54 1593.23 264.32 1608.9 289.64C1615.3 299.99 1615.07 311.76 1615.12 323.5C1615.2 340.98 1614.3 358.67 1615.5 376.11ZM1571.06 338.5C1564.73 337.21 1551.9 336.86 1545.88 339.42C1541.42 341.31 1538.78 346.18 1540.61 350.87C1542.96 356.91 1549.9 357.73 1555.5 357.22C1566.67 356.18 1571.87 349.36 1571.06 338.5Z';

const EVENTOMAX_LOGO_NAVY_PATH =
  'M273.09 157.81C320.77 186.21 368.45 214.61 416.13 243C417.63 247.99 416.81 254.29 416.81 259.5C416.8 269.83 416.71 280.17 416.74 290.5C416.76 295.78 418.13 303.61 415.91 308.24C368.22 279.48 320.53 250.72 272.85 221.96C271.4 217.34 272.27 211.37 272.26 206.5C272.24 196.17 272.21 185.83 272.28 175.5C272.32 170.12 271.12 162.66 273.09 157.81ZM745.83 237.23C745.83 247.32 745.83 257.41 745.83 267.5C738.26 269.52 729.35 268.4 721.5 268.3C711.17 268.18 700.83 268.42 690.5 268.38C682.69 268.35 674.84 267.86 667.06 268.82C667.06 276.84 667.06 284.86 667.06 292.88C688.88 292.88 710.69 292.88 732.5 292.88C734.81 298.57 734.85 319.31 732.5 324.98C710.68 324.98 688.87 324.98 667.05 324.98C667.05 333.14 667.05 341.3 667.05 349.45C674.39 350.54 682.09 350.02 689.5 349.98C701.16 349.93 712.84 349.84 724.5 349.97C731.61 350.04 740.63 348.23 747.08 351.41C747.08 361.46 747.08 371.5 747.08 381.55C740.08 384.71 721.93 382.95 713.5 382.97C693.83 383.01 674.17 382.91 654.5 382.94C646.85 382.95 632.28 384.21 625.5 382.36C623.27 378.87 624.04 374.58 624.06 370.5C624.08 363.17 623.97 355.83 623.99 348.5C624.07 321.84 624.15 295.16 624.1 268.5C624.09 261.5 624.06 254.5 624.05 247.5C624.04 243.67 623.53 239.91 625.5 236.6C632.82 234.31 647.35 235.88 655.5 235.94C675.17 236.09 694.83 235.72 714.5 235.9C722.21 235.98 739.67 234.01 745.83 237.23ZM1152.5 246.31C1153.17 253.96 1153.83 261.61 1154.5 269.26C1162.25 269.71 1171.52 267.7 1178.81 270.5C1180.46 274.9 1180.6 295.07 1179.09 299.5C1174.01 302.04 1160.88 300.07 1154.5 300.6C1151.88 310.44 1153.45 327.83 1153.43 338.5C1153.42 343.05 1153.31 349.02 1157.86 351.6C1165.32 355.84 1171.27 348.82 1177.53 350.5C1180.04 355.39 1182.35 373.9 1181.8 379.5C1176.36 384.73 1165.75 385.67 1158.5 386.02C1152.88 386.28 1147.12 386.13 1141.64 384.73C1138.08 383.82 1134.38 382.18 1131.19 380.35C1110.32 368.45 1114.29 337.59 1114.39 317.5C1114.42 311.88 1114.89 305.9 1113.5 300.5C1110.17 300.5 1106.83 300.5 1103.5 300.5C1101.89 293.62 1101.88 276.46 1103.7 269.65C1106.97 269.65 1110.23 269.65 1113.5 269.65C1114.09 261.93 1114.69 254.22 1115.28 246.5C1122.16 243.82 1133.94 245.38 1141.5 245.35C1145.26 245.34 1149.05 244.82 1152.5 246.31ZM984.5 336.18C978.83 338.62 967.95 337.07 961.5 337.12C949.17 337.21 936.83 337.09 924.5 337.08C917.63 337.08 910.57 336.71 903.76 337.5C906.49 353.23 926.23 356.92 939.29 352.73C945.45 350.75 949.82 346.32 955.5 343.9C960.86 346.82 973.92 358.47 977.28 363.5C976.43 368.77 970.4 372.72 965.93 375.43C952.72 383.46 937.79 386.21 922.5 385.91C878.84 385.07 851.11 343.66 867.32 302.77C881.63 266.66 930.47 256.67 961.29 277.21C975.34 286.57 983.13 301.8 985.43 318.24C986.15 323.42 987.2 331.63 984.5 336.18ZM1102.5 381.77C1099.38 383.43 1096.05 382.93 1092.5 382.89C1085.78 382.82 1069.66 384.48 1064.5 381.53C1062.97 375.23 1063.99 367.97 1063.96 361.5C1063.92 348.83 1063.94 336.17 1063.87 323.5C1063.8 311.82 1061.96 300.66 1047.5 300.78C1035.21 300.88 1030.27 311.74 1030.08 322.5C1029.85 335.49 1030.01 348.51 1030.1 361.5C1030.14 367.86 1031.21 375.4 1029.34 381.5C1026.07 383.5 1022.31 383.02 1018.5 383.06C1010.28 383.13 1000.49 384.23 992.5 382.39C989.58 377.59 991.13 360.94 991.11 354.5C991.04 335.17 991.22 315.83 991.14 296.5C991.12 289.91 989.78 276.06 992.09 270.5C995.37 268.99 998.91 269.47 1002.5 269.41C1009.92 269.27 1022.31 267.6 1028.95 270.5C1029.47 272.88 1029.98 275.27 1030.5 277.65C1037.12 273.54 1042.58 269.52 1050.5 268.06C1056.21 267 1061.78 266.85 1067.52 267.75C1072.07 268.46 1076.57 269.68 1080.69 271.79C1108.98 286.31 1102.82 318.97 1102.87 345.5C1102.88 356.54 1104.45 371.19 1102.5 381.77ZM780.5 270.1C789.5 292.92 798.5 315.74 807.5 338.56C811.94 330.6 814.13 321.21 817.22 312.65C819.91 305.19 823.36 297.97 825.96 290.47C827.43 286.23 830.63 272.78 833.88 270.4C837.34 267.86 850.83 269.31 855.5 269.28C860.5 269.24 866.92 268.18 871.36 270.5C872.3 274.39 870.01 278.32 868.42 281.9C865.83 287.73 863.67 293.82 861.28 299.75C854.12 317.57 846.69 335.29 839.6 353.13C836.44 361.09 831.82 375.22 827.5 381.97C823.78 383.56 819.53 382.98 815.5 383C808.08 383.03 792.89 384.51 786.5 382.2C782.27 376.09 777.77 361.26 774.74 353.72C767.88 336.65 760.93 319.56 753.87 302.58C751.23 296.22 748.47 289.92 745.95 283.52C744.85 280.72 743.45 277.82 744.36 274.8C744.95 272.84 746.93 270.12 748.92 269.5C752.06 268.53 756.25 269.14 759.5 269.17C766.2 269.22 774.1 268.07 780.5 270.1ZM1237.56 269.38C1266.23 266.75 1295.36 283.44 1303.71 311.71C1313.64 345.32 1289.67 380.74 1255.48 385.82C1243.45 387.6 1231.32 386.61 1219.88 382.56C1187.56 371.12 1171.9 331.88 1187.76 301.28C1197.46 282.57 1216.94 271.28 1237.56 269.38ZM406.27 335.5C406.27 371.83 406.27 408.17 406.27 444.5C384.31 456.17 362.35 467.83 340.39 479.5C340.39 418.83 340.39 358.17 340.39 297.5C346.61 298.48 352.19 303.76 357.76 306.71C374.27 315.47 390.42 325.58 406.27 335.5ZM945.9 315.11C943.87 290.64 906.92 290.82 903.67 315.11C917.75 315.11 931.82 315.11 945.9 315.11ZM1243.49 302.5C1213.69 302.54 1213.36 352.91 1243.5 353.03C1273.64 353.14 1273.68 302.45 1243.49 302.5ZM636.68 418.27C642.87 416.62 650.16 418.09 654.53 422.96C660.73 429.9 657.73 441.28 649.73 445.26C642.27 448.97 632.4 446.82 628.11 439.36C623.6 431.52 627.76 420.64 636.68 418.27ZM690.88 438.5C690.88 441.18 690.88 443.86 690.88 446.55C688.88 446.55 686.89 446.55 684.9 446.55C684.9 437.2 684.9 427.85 684.9 418.5C690.34 417.85 698.08 416.66 703.05 419.48C709.49 423.13 709.98 433.08 703.24 436.73C699.52 438.75 694.92 438 690.88 438.5ZM755.56 423.13C750.71 423.13 745.85 423.13 740.99 423.13C740.99 425.25 740.99 427.38 740.99 429.5C743.32 429.78 752.48 429.28 753.46 430.92C754.05 431.9 753.55 433.92 753.49 435.01C749.32 435.01 745.15 435.01 740.99 435.01C740.99 437.14 740.99 439.28 740.99 441.41C743.49 441.58 753.87 441.01 755.25 442.13C756.23 442.93 755.89 444.41 755.99 445.5C754.61 446.63 756.71 445.81 755.21 446.6C753.8 447.34 751.05 446.8 749.5 446.8C744.45 446.8 739.41 447.04 734.39 446.5C734.39 437.17 734.39 427.83 734.39 418.5C739.33 417.77 744.49 417.92 749.5 417.98C751.04 417.99 753.71 417.59 755 418.62C756.12 419.51 755.56 421.98 755.56 423.13ZM801.45 437.5C803.2 440.51 804.96 443.52 806.72 446.53C804.64 446.53 802.57 446.53 800.5 446.53C795.71 440.72 797.88 437.73 789.01 438.04C789.01 440.85 789.01 443.67 789.01 446.48C787.05 446.48 785.08 446.48 783.11 446.48C783.11 437.15 783.11 427.82 783.11 418.49C792 417.61 810.62 416.41 805.89 431.39C805.08 433.92 802.83 435.42 801.45 437.5ZM847.5 418.45C849.75 420.46 850.64 423.71 851.91 426.55C854.65 432.68 859.39 439.85 859.7 446.5C853.55 446.92 854.1 445.81 851.5 440.89C847.5 440.89 843.5 440.89 839.5 440.89C838.5 442.77 837.5 444.66 836.5 446.55C834.5 446.55 832.5 446.55 830.5 446.55C834.5 437.18 838.5 427.81 842.5 418.45C844.17 418.45 845.83 418.45 847.5 418.45ZM908.78 422.5C907.69 423.66 906.59 424.83 905.5 425.99C898.92 421.47 888.85 422.42 889.19 432.48C889.55 442.98 898.8 442.57 905.6 438.5C906.77 439.83 907.94 441.17 909.11 442.5C899.68 451.47 883.24 446.28 882.96 432.5C882.7 419.68 900.5 412.03 908.78 422.5ZM935.89 418.47C937.86 418.47 939.83 418.47 941.79 418.47C941.79 427.85 941.79 437.23 941.79 446.61C939.83 446.61 937.86 446.61 935.89 446.61C935.89 437.23 935.89 427.85 935.89 418.47ZM979.6 418.2C985.47 416.91 992.39 418.36 996.28 423.23C1002.53 431.05 998.18 443.6 988.86 446.4C968.18 452.62 959.76 422.58 979.6 418.2ZM1026.5 418.41C1027.94 418.35 1029.52 418 1030.91 418.6C1035.83 420.72 1040.02 432.31 1045.75 434.63C1045.75 429.24 1045.75 423.85 1045.75 418.46C1047.22 418.4 1050.26 417.65 1051.31 419.14C1052.44 420.74 1051.81 424.63 1051.82 426.5C1051.84 432.98 1052.3 439.73 1051.5 446.14C1049.84 446.57 1047.84 447.15 1046.11 446.37C1044.37 445.6 1043.15 442.9 1042.05 441.44C1038.95 437.29 1035.84 433.11 1032.5 429.15C1031.38 433.07 1031.55 437.37 1031.53 441.5C1031.53 442.72 1032.05 445.38 1030.89 446.25C1029.65 447.17 1027.62 446.62 1026.23 446.5C1025.02 440.71 1024.54 423.77 1026.5 418.41ZM1100.63 423.1C1095.81 423.1 1090.99 423.1 1086.17 423.1C1086.17 425.23 1086.17 427.37 1086.17 429.5C1088.41 429.75 1097.76 429.33 1098.73 430.72C1099.2 431.4 1098.93 432.74 1099.01 433.5C1095.98 436.19 1090.25 434.68 1086.12 435.5C1086.12 437.41 1086.12 439.32 1086.12 441.23C1088.84 441.61 1098.83 440.83 1100.35 442C1101.51 442.89 1101.14 444.24 1101.3 445.5C1097.01 448.1 1085.33 446.86 1079.92 446.51C1079.92 437.19 1079.92 427.87 1079.92 418.56C1085.09 418.04 1090.3 418.04 1095.5 418.14C1096.8 418.17 1099.57 417.72 1100.43 418.99C1101.11 419.98 1100.64 422.05 1100.63 423.1ZM1149 421.5C1148.17 422.8 1147.33 424.09 1146.5 425.39C1142.4 423.38 1137.28 420.73 1134.22 425.5C1137.39 432.63 1153.53 428.24 1149.55 441.12C1146.68 450.39 1131.74 447.71 1126.68 442.5C1127.53 441.17 1128.39 439.83 1129.24 438.5C1133.85 440.57 1140.12 444.83 1143.3 438.5C1138.92 432.72 1124.69 435.37 1128.05 423.55C1130.41 415.22 1144.23 417.1 1149 421.5ZM1208.8 446.5C1208.8 437.2 1208.8 427.9 1208.8 418.6C1214.63 418.18 1221.34 417.36 1226.9 419.58C1236.54 423.43 1238.66 437.22 1230.21 443.67C1224.51 448.01 1215.5 447.1 1208.8 446.5ZM1282.63 419.5C1282.54 420.31 1282.75 421.76 1282.04 422.38C1280.08 424.06 1271.01 423.14 1268.06 423.5C1268.06 425.5 1268.06 427.5 1268.06 429.5C1270.18 429.82 1279.86 429.61 1280.69 430.77C1281.17 431.43 1280.91 432.75 1280.99 433.5C1277.92 436.21 1272.08 434.65 1267.95 435.5C1267.95 437.5 1267.95 439.5 1267.95 441.5C1270.83 441.59 1280.29 440.7 1282.34 442.06C1284.29 443.36 1281.54 441.85 1283.2 443.5C1282.97 444.7 1283.22 445.56 1282.29 446.46C1281.69 447.03 1278.25 446.64 1277.5 446.67C1272.32 446.84 1267.1 446.98 1261.94 446.5C1261.94 437.17 1261.94 427.84 1261.94 418.51C1266.61 418.33 1279.26 416.98 1282.63 419.5ZM1362.11 419.5C1361.98 420.64 1362.33 422.09 1361.28 422.91C1359.8 424.06 1349.78 423.23 1347.21 423.5C1347.21 425.5 1347.21 427.5 1347.21 429.5C1349.61 429.92 1358.84 429.29 1359.9 430.67C1360.45 431.38 1360.2 432.69 1360.32 433.5C1358.48 434.93 1361.39 433.71 1359.33 434.76C1357.04 435.94 1350.18 434.77 1347.03 435.5C1347.03 437.46 1347.03 439.42 1347.03 441.38C1349.67 441.62 1359.85 440.86 1361.37 441.99C1362.57 442.89 1362.2 444.22 1362.36 445.5C1358.47 447.95 1346.01 447.09 1340.97 446.5C1340.97 437.17 1340.97 427.83 1340.97 418.5C1345.94 418.05 1358.45 416.88 1362.11 419.5ZM1399.5 437.35C1403.08 433.9 1404.08 428.14 1406.03 423.52C1406.63 422.1 1407.25 419.1 1408.79 418.43C1410.2 417.82 1412.22 418.34 1413.68 418.5C1410.12 427.88 1406.56 437.25 1403 446.63C1401.15 446.63 1399.29 446.63 1397.44 446.63C1393.74 437.25 1390.04 427.88 1386.34 418.5C1387.92 418.42 1390.27 417.89 1391.66 418.84C1393.62 420.19 1398.33 434.31 1399.5 437.35ZM1460.23 419.5C1460.08 420.71 1460.44 422.14 1459.32 422.99C1457.77 424.19 1448.15 423.26 1445.31 423.89C1445.31 425.64 1445.31 427.39 1445.31 429.14C1447.77 429.84 1456.83 429.36 1457.87 430.71C1458.44 431.44 1458.15 432.67 1458.27 433.5C1456.5 434.91 1459.27 433.71 1457.31 434.74C1455.09 435.92 1448.2 434.89 1445.16 435.5C1445.16 437.38 1445.16 439.27 1445.16 441.15C1447.94 441.68 1458.84 441.05 1459.99 442.62C1460.54 443.37 1460.21 444.67 1460.3 445.5C1458.46 446.7 1461.14 445.76 1459.26 446.58C1457.03 447.56 1442.24 446.68 1439.08 446.35C1439.08 437.08 1439.08 427.81 1439.08 418.54C1444.11 418.08 1456.43 416.99 1460.23 419.5ZM1507.02 435.5C1507.02 429.82 1507.02 424.14 1507.02 418.46C1509.04 418.46 1511.06 418.46 1513.09 418.46C1513.09 427.84 1513.09 437.23 1513.09 446.61C1511.32 446.62 1508.97 447.06 1507.33 446.19C1503.71 444.27 1497.71 432.99 1493.25 429.58C1493.25 435.22 1493.25 440.86 1493.25 446.5C1491.85 446.53 1488.9 447.1 1487.84 445.8C1486.62 444.29 1487.33 440.36 1487.34 438.5C1487.38 432.03 1486.89 425.43 1487.5 419C1489.03 418.51 1490.59 417.89 1492.28 418.35C1496.51 419.51 1502.2 433.1 1507.02 435.5ZM1561.08 419.5C1560.31 424.68 1557.27 423.16 1552.8 423.5C1552.8 431.19 1552.8 438.87 1552.8 446.56C1550.96 446.56 1549.12 446.56 1547.27 446.56C1546.72 438.87 1546.16 431.19 1545.61 423.5C1541.18 423.04 1538.47 424.67 1537.88 419.5C1539.47 418.4 1537.14 419.15 1538.78 418.43C1540.21 417.81 1542.94 418.34 1544.5 418.3C1549.35 418.19 1557.2 416.77 1561.08 419.5ZM1593.63 418.23C1611.86 413.95 1621.95 437.96 1605.1 445.55C1597.74 448.87 1588.25 446.66 1584.29 439.22C1579.97 431.1 1584.65 420.34 1593.63 418.23ZM1658.58 425.5C1653.56 425.02 1650.13 420.03 1645.56 425.5C1646.02 426.34 1646.08 427 1646.77 427.72C1650.37 431.52 1664.74 429.62 1661.21 440.56C1658.08 450.27 1643.84 447.69 1637.99 442.5C1638.83 441.11 1639.66 439.73 1640.5 438.34C1644.76 440.88 1652.35 445.08 1654.83 438.5C1651.09 432.99 1634.94 434.69 1639.71 423.26C1642.11 417.49 1649.98 416.97 1655.14 418.42C1656.71 418.86 1659.63 419.71 1660.01 421.56C1660.29 422.94 1659.16 424.37 1658.58 425.5ZM638.76 423.34C628.05 426.61 633.25 444.05 643.92 441.45C656.11 438.47 651.89 419.33 638.76 423.34ZM700.78 431.5C704.26 423.26 697.17 422.42 690.89 423.5C690.89 426.5 690.89 429.5 690.89 432.5C694.35 433.09 697.78 433.56 700.78 431.5ZM799.5 430.71C801.73 422.6 795.28 422.4 789.16 423.5C789.16 426.4 789.16 429.29 789.16 432.19C792.94 432.72 796.26 432.84 799.5 430.71ZM980.81 423.39C970.37 426.88 974.95 443.98 985.91 441.44C997.68 438.72 992.83 419.37 980.81 423.39ZM1215.11 441.19C1219.03 441.74 1223.26 441.76 1226.33 438.84C1230.88 434.51 1229.76 426.05 1223.64 423.76C1220.98 422.77 1217.83 423.24 1215.11 423.65C1215.11 429.5 1215.11 435.34 1215.11 441.19ZM1595.78 423.38C1584.87 426.13 1588.77 443.66 1599.89 441.45C1611.53 439.14 1607.68 420.38 1595.78 423.38ZM845.5 426.68C843.2 429.23 842.33 432.23 841.73 435.65C844.07 435.65 846.42 435.65 848.76 435.65C847.67 432.66 846.59 429.67 845.5 426.68Z';

function escapeHtml(raw: string | number | null | undefined): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Parses server audit/creation timestamps (`createdAt`, `updatedAt`, `queriedAt`) as UTC.
 * Delegates to centralized `chile-time.ts` utility (`America/Santiago`, `es-CL`, 24h).
 */
export function parseServerTimestampAsUtc(iso: string | null | undefined): Date | null {
  return parseServerTimestampAsUtcCore(iso);
}

export function formatServerTimestampChile(iso: string | null | undefined): {
  readonly full: string;
  readonly compact: string;
  readonly tzLabel: string;
} {
  const formatted = formatOperationalTimestampChile(iso);
  return {
    full: formatted.ticketFull,
    compact: formatted.compact,
    tzLabel: formatted.commaTzLabel,
  };
}

export function formatServerTimestampUtc(iso: string | null | undefined): string {
  return formatUtcReference(iso);
}

function formatServerTimestampIsoUtc(iso: string | null | undefined): string {
  return formatUtcIsoSeconds(iso);
}

/**
 * Formats an event's `scheduledAt` in Chilean continental time (`America/Santiago`).
 * Preserves naive wall-clock local times and converts offset-aware strings cleanly.
 */
export function formatChileEventDateTime(iso: string | null | undefined): {
  readonly full: string;
  readonly kpiMain: string;
  readonly kpiSub: string;
  readonly approxInstant: Date | null;
} {
  const formatted = formatScheduledAtChile(iso);
  return {
    full: formatted.ticketFull,
    kpiMain: formatted.kpiMain,
    kpiSub: formatted.kpiSub,
    approxInstant: formatted.approxInstant,
  };
}

function formatOrganizerIdCaption(
  organizerId?: string | null,
  resolutionSource?: OrganizerResolutionSource | null,
): string {
  const rawId = organizerId?.trim() ?? '';
  if (!rawId) return 'No disponible';
  if (resolutionSource === 'ENTRA_GRAPH') {
    return 'ID interno protegido (directorio Entra ID)';
  }
  if (resolutionSource === 'EXTERNAL_CONTACT') {
    return 'ID interno protegido (contacto externo)';
  }
  if (isTechnicalOrganizerIdentifier(rawId)) {
    return 'ID interno protegido (registro de producción)';
  }
  return rawId;
}

function isSameCrew(
  nameA: string | null | undefined,
  idA: string | null | undefined,
  nameB: string | null | undefined,
  idB: string | null | undefined,
): boolean {
  const nA = (nameA ?? '').trim().toLowerCase();
  const iA = (idA ?? '').trim().toLowerCase();
  const nB = (nameB ?? '').trim().toLowerCase();
  const iB = (idB ?? '').trim().toLowerCase();
  if (!nB && !iB) return true;
  return nA === nB && iA === iB;
}

export function buildCrewTicketQrPayload(
  ticket: Pick<CrewTicket, 'id' | 'productionId' | 'eventId' | 'createdAt'>,
  historicalCrewId?: string | null,
): string {
  const folioShort = `OT-${String(ticket.id).padStart(4, '0')}`;
  const cleanCrewId = historicalCrewId?.trim() || null;
  const issuedIsoUtc = formatServerTimestampIsoUtc(ticket.createdAt);
  return [
    'EMX',
    folioShort,
    `PRD-${ticket.productionId}`,
    ticket.eventId ? `EVT:${ticket.eventId}` : 'EVT:NO_ID',
    cleanCrewId ? `CREW:${cleanCrewId}` : 'CREW:SIN_ID',
    issuedIsoUtc,
  ].join('|');
}

export function buildCrewTicketPrintHtml(data: CrewTicketPrintData): string {
  const {
    ticket,
    crewName,
    crewId,
    currentCrewName,
    currentCrewId,
    directive,
    statusLabel,
    reservations,
    organizerId,
    organizerDisplayName,
    organizerResolutionSource,
    productionStatusLabel,
    productionStatusCode,
    productionUpdatedAt,
    productionQueriedAt,
  } = data;

  const folioShort = `OT-${String(ticket.id).padStart(4, '0')}`;
  const docCode = `EMX-OT-PRD-${ticket.productionId}-${String(ticket.id).padStart(4, '0')}`;
  const docTitle = `Orden-Cuadrilla-Produccion-${ticket.productionId}-${folioShort}`;

  const issuedCl = formatServerTimestampChile(ticket.createdAt);
  const issuedUtc = formatServerTimestampUtc(ticket.createdAt);
  const scheduled = formatChileEventDateTime(ticket.scheduledAt);

  const emitStatusRaw = (statusLabel || ticket.status || 'Sin registro').trim().replace(/_/g, ' ');
  const emitStatusDisplay = emitStatusRaw.toUpperCase();
  const currentStatusDisplay = productionStatusLabel?.trim()
    ? productionStatusLabel.trim().replace(/_/g, ' ').toUpperCase()
    : 'NO DISPONIBLE';

  let currentStatusContext = 'Sin consulta actualizada';
  if (productionQueriedAt) {
    const qCl = formatServerTimestampChile(productionQueriedAt);
    currentStatusContext = `Consultado: ${qCl.compact}`;
  } else if (productionUpdatedAt) {
    const uCl = formatServerTimestampChile(productionUpdatedAt);
    currentStatusContext = `Ref. al ${uCl.compact}`;
  }

  // Detect closure prior to scheduled event date (purely observational, never alters origin data)
  const isClosedNow =
    (productionStatusCode ?? '').toString().toUpperCase() === 'CERRADO' ||
    currentStatusDisplay === 'CERRADO';
  const refInstant =
    parseServerTimestampAsUtc(productionUpdatedAt) ??
    parseServerTimestampAsUtc(productionQueriedAt) ??
    parseServerTimestampAsUtc(ticket.createdAt);
  const closedBeforeScheduledDate =
    isClosedNow &&
    scheduled.approxInstant !== null &&
    refInstant !== null &&
    refInstant.getTime() < scheduled.approxInstant.getTime();

  // Organizer: real data only, never raw canonical UUIDs, never fabricated names or RUTs
  const rawOrganizerDisplay = formatOrganizerDisplayLabel(
    organizerId,
    organizerDisplayName,
    organizerResolutionSource,
  );
  const organizerNameDisplay =
    rawOrganizerDisplay === 'Organizador no disponible' ? 'No disponible' : rawOrganizerDisplay;
  const organizerIdDisplay = formatOrganizerIdCaption(organizerId, organizerResolutionSource);

  // Crew: separated name & ID, respecting historical ticket crew vs current production crew
  const historicalCrewName = crewName?.trim() || null;
  const historicalCrewId = crewId?.trim() || null;
  const showCurrentCrewDiff =
    Boolean(currentCrewName?.trim() || currentCrewId?.trim()) &&
    !isSameCrew(historicalCrewName, historicalCrewId, currentCrewName, currentCrewId);

  const directiveText = directive?.trim() || 'Sin instrucciones operativas registradas.';
  const safeReservations = reservations ?? [];
  const totalItems = safeReservations.length;
  const totalUnits = safeReservations.reduce((acc, r) => acc + (r.quantity || 0), 0);
  const itemsLabel = totalItems === 1 ? '1 ítem' : `${totalItems} ítems`;
  const unitsLabel = totalUnits === 1 ? '1 unidad' : `${totalUnits} unidades`;
  const kpiEquipmentValue =
    totalItems > 0 ? `${itemsLabel} · ${unitsLabel}` : 'Sin reservas';

  const qrPayload = buildCrewTicketQrPayload(ticket, historicalCrewId);
  const qrSvg = buildInternalTraceabilityQrSvg(qrPayload, 54, '#031c43');

  const reservationsRows =
    safeReservations.length > 0
      ? safeReservations
          .map((r, idx) => {
            const eqCode =
              r.equipmentId !== null && r.equipmentId !== undefined
                ? `EQ-${String(r.equipmentId).padStart(3, '0')}`
                : 'Sin registro';
            const resCode =
              r.reservationId !== null && r.reservationId !== undefined
                ? `#${r.reservationId} (RES-${String(r.reservationId).padStart(4, '0')})`
                : 'Sin registro';
            const qtyText = `${r.quantity} ${r.quantity === 1 ? 'unidad' : 'unidades'}`;
            return `<tr>
              <td class="c mono">${idx + 1}</td>
              <td class="c mono bold nw">${escapeHtml(eqCode)}</td>
              <td class="eq-desc">${escapeHtml(r.equipmentName)}</td>
              <td class="c mono nw">${escapeHtml(resCode)}</td>
              <td class="c mono bold nw">${escapeHtml(qtyText)}</td>
              <td class="c"><span class="status-pill">${escapeHtml(r.status)}</span></td>
              <td class="muted">Sin observaciones</td>
            </tr>`;
          })
          .join('\n')
      : `<tr>
          <td colspan="7" class="empty-row">Sin reservas de equipamiento registradas para la Producción #${escapeHtml(ticket.productionId)}.</td>
        </tr>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(docTitle)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm 10mm 8.5mm 10mm;
      @bottom-left {
        content: "EventoMax · Orden de Trabajo Técnica ${escapeHtml(folioShort)} · Producción #${escapeHtml(ticket.productionId)}";
        font-family: 'Segoe UI', 'Inter', 'Roboto', Arial, sans-serif;
        font-size: 7.1pt;
        color: #64748b;
      }
      @bottom-right {
        content: "Página " counter(page) " de " counter(pages);
        font-family: 'Segoe UI', 'Inter', 'Roboto', Arial, sans-serif;
        font-size: 7.4pt;
        font-weight: 700;
        color: #031c43;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: 'Segoe UI', 'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-size: 8.4pt;
      line-height: 1.3;
    }

    .top-accent {
      height: 3.5px;
      background: linear-gradient(90deg, #024ffc 0%, #1d4ed8 60%, #031c43 100%);
      border-radius: 2px;
      margin-bottom: 4px;
    }

    .doc-flow {
      display: flex;
      flex-direction: column;
      gap: 5.5px;
    }

    /* 1. Encabezado corporativo minimalista */
    .hero {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      padding-bottom: 4.5px;
      border-bottom: 1px solid #e2e8f0;
      break-inside: avoid;
    }
    .hero-left {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1.5px;
    }
    .emx-official-logo {
      height: 23px;
      width: auto;
      display: block;
    }
    .hero-title {
      margin: 2px 0 0;
      font-size: 14pt;
      font-weight: 800;
      color: #031c43;
      letter-spacing: -0.015em;
      line-height: 1.08;
    }
    .hero-sub {
      margin: 0;
      font-size: 8.2pt;
      color: #475569;
      font-weight: 500;
    }
    .hero-right {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2.5px;
      flex-shrink: 0;
    }
    .folio-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 999px;
      padding: 2.5px 9.5px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 9pt;
      font-weight: 800;
      color: #024ffc;
    }
    .hero-meta {
      font-size: 8pt;
      color: #334155;
      line-height: 1.32;
    }
    .hero-meta strong {
      color: #031c43;
    }

    /* 2. Cuatro tarjetas operativas KPI */
    .kpi-row {
      display: grid;
      grid-template-columns: 0.96fr 1.24fr 1.05fr 1.05fr;
      gap: 6.5px;
      break-inside: avoid;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      padding: 4.5px 8px;
    }
    .kpi-k {
      font-size: 6.8pt;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .kpi-v {
      margin-top: 2px;
      font-size: 8.5pt;
      font-weight: 800;
      color: #031c43;
      line-height: 1.15;
    }
    .kpi-s {
      margin-top: 1px;
      font-size: 7.2pt;
      color: #475569;
      line-height: 1.18;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .dot {
      display: inline-block;
      width: 6.5px;
      height: 6.5px;
      border-radius: 50%;
      margin-right: 4px;
      vertical-align: 1px;
    }
    .dot-blue { background: #024ffc; }
    .dot-slate { background: #475569; }
    .dot-amber { background: #d97706; }

    /* 3. Tarjetas Evento + Cuadrilla */
    .cards-2 {
      display: grid;
      grid-template-columns: 1.16fr 1fr;
      gap: 7.5px;
      break-inside: avoid;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      padding: 6px 9.5px;
    }
    .card-eyebrow {
      font-size: 7.1pt;
      font-weight: 800;
      color: #024ffc;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0 0 3px;
    }
    .card-heading {
      font-size: 9.5pt;
      font-weight: 800;
      color: #031c43;
      margin: 0 0 3.5px;
      line-height: 1.18;
    }
    .kv-clean {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
    }
    .kv-clean td {
      padding: 1.5px 0;
      vertical-align: top;
    }
    .kv-clean td.k {
      width: 100px;
      color: #475569;
      font-weight: 600;
      padding-right: 6px;
    }
    .kv-clean td.v {
      color: #0f172a;
      font-weight: 500;
    }
    .id-tag {
      display: inline-block;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 8pt;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #031c43;
      padding: 0.5px 6.5px;
      border-radius: 4px;
      font-weight: 700;
    }
    .muted {
      color: #64748b;
      font-style: italic;
    }
    .mono {
      font-family: 'Consolas', 'Courier New', monospace;
    }
    .bold {
      font-weight: 700;
      color: #031c43;
    }
    .context-note {
      margin-top: 3px;
      padding: 2.5px 6.5px;
      border-radius: 4px;
      background: #f8fafc;
      border-left: 2.5px solid #64748b;
      font-size: 7.3pt;
      color: #475569;
      line-height: 1.24;
    }

    /* 4. Instrucciones y observaciones */
    .inst-strip {
      background: #f8fafc;
      border: 1px solid #dbeafe;
      border-left: 4px solid #024ffc;
      border-radius: 7px;
      padding: 5px 10px;
      display: grid;
      grid-template-columns: 1.38fr 1fr;
      gap: 11px;
      align-items: start;
      break-inside: avoid;
    }
    .inst-k {
      font-size: 7pt;
      font-weight: 800;
      color: #024ffc;
      text-transform: uppercase;
      letter-spacing: 0.055em;
      margin-bottom: 1.5px;
    }
    .inst-v {
      font-size: 8.5pt;
      font-weight: 700;
      color: #031c43;
      margin: 0;
      line-height: 1.24;
    }
    .inst-obs {
      border-left: 1px solid #cbd5e1;
      padding-left: 10px;
      font-size: 8pt;
      color: #334155;
    }

    /* 5. Manifiesto de equipamiento (paginación flexible sin recortar filas) */
    .table-card {
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      overflow: hidden;
    }
    .table-top {
      padding: 4.5px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      break-after: avoid;
    }
    .table-title {
      font-size: 7.6pt;
      font-weight: 800;
      color: #031c43;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .table-note {
      font-size: 7.2pt;
      color: #92400e;
      background: #fffbeb;
      border: 1px solid #fde68a;
      padding: 1px 7.5px;
      border-radius: 999px;
      font-weight: 700;
    }
    table.modern {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
    }
    table.modern thead {
      display: table-header-group;
    }
    table.modern tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    table.modern th {
      background: #f8fafc;
      color: #475569;
      font-size: 7pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 4px 6.5px;
      text-align: left;
      border-bottom: 1px solid #cbd5e1;
    }
    table.modern td {
      padding: 3.5px 6.5px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    table.modern tbody tr:last-child td {
      border-bottom: none;
    }
    table.modern .c { text-align: center; }
    table.modern .nw { white-space: nowrap; }
    .eq-desc {
      font-weight: 700;
      color: #0f172a;
    }
    .status-pill {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 999px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      font-size: 7pt;
      font-weight: 800;
    }
    .empty-row {
      text-align: center;
      color: #475569;
      font-style: italic;
      padding: 7px !important;
      background: #f8fafc;
    }
    .table-foot {
      padding: 4px 10px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      break-inside: avoid;
    }

    /* 6. Control de montaje y seguridad operativa */
    .field-row {
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      gap: 7.5px;
      break-inside: avoid;
    }
    .chk-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .chk-list li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
      padding: 2.5px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 8pt;
      color: #0f172a;
    }
    .chk-list li:last-child {
      border-bottom: none;
    }
    .box-c {
      display: inline-block;
      width: 9.5px;
      height: 9.5px;
      border: 1.3px solid #64748b;
      border-radius: 2px;
      vertical-align: -1.5px;
      margin-right: 5px;
      background: #ffffff;
    }
    .pend-soft {
      font-size: 6.9pt;
      color: #475569;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 0.5px 5.5px;
      border-radius: 999px;
      white-space: nowrap;
      font-weight: 600;
    }
    .sec-guide {
      font-size: 7.3pt;
      color: #475569;
      background: #f8fafc;
      border-left: 2.5px solid #94a3b8;
      padding: 2px 6.5px;
      margin: 0 0 3px;
      border-radius: 0 3px 3px 0;
    }
    .mini-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 10px;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #334155;
    }
    .mini-line {
      border-bottom: 1px solid #94a3b8;
      padding-bottom: 1.5px;
      min-height: 14px;
    }
    .mini-line.full {
      grid-column: 1 / -1;
      min-height: 15px;
    }

    /* 7. Cierre operacional: Conformidad + Trazabilidad agrupados para evitar páginas huérfanas */
    .closing-block {
      display: flex;
      flex-direction: column;
      gap: 5.5px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* 7a. Tres bloques de conformidad y firma manual */
    .conf-section {
      break-inside: avoid;
    }
    .conf-section-lbl {
      font-size: 7.1pt;
      font-weight: 800;
      color: #024ffc;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0 0 3px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .conf-section-sub {
      font-size: 7.1pt;
      font-weight: 500;
      color: #64748b;
      text-transform: none;
      letter-spacing: 0;
    }
    .conf-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 7.5px;
    }
    .conf-card {
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      padding: 5px 9px;
      background: #fcfcfd;
      display: flex;
      flex-direction: column;
    }
    .conf-t {
      font-size: 8pt;
      font-weight: 800;
      color: #031c43;
      line-height: 1.15;
    }
    .conf-s {
      font-size: 7.1pt;
      color: #64748b;
      margin-top: 1px;
    }
    .conf-pad {
      height: 22px;
      border-bottom: 1px solid #64748b;
      margin: 3px 0;
    }
    .conf-meta {
      font-size: 7.4pt;
      color: #475569;
      line-height: 1.42;
    }

    /* 8. Trazabilidad operativa interna (única zona con RabbitMQ y Event ID) */
    .trace-wrap {
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      background: #f8fafc;
      padding: 4.5px 9px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      break-inside: avoid;
    }
    .trace-text {
      flex: 1;
      font-size: 7.2pt;
      color: #334155;
      line-height: 1.35;
    }
    .trace-text strong {
      color: #031c43;
    }
    .trace-eyebrow {
      font-size: 6.8pt;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 1px;
    }
    .trace-disclaimer {
      margin-top: 1px;
      font-size: 6.9pt;
      color: #64748b;
    }
    .qr-box {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 2px;
      background: #ffffff;
    }
    .qr-cap {
      font-size: 5.9pt;
      font-weight: 700;
      color: #475569;
      margin-top: 1px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
  </style>
</head>
<body>
  <div class="top-accent"></div>

  <main class="doc-flow">
    <header class="hero">
      <div class="hero-left">
        <svg
          class="emx-official-logo"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="145 154 1606 328"
          role="img"
          aria-label="EventoMax"
        >
          <path d="${EVENTOMAX_LOGO_BLUE_PATH}" fill="#024ffc" fill-rule="evenodd" />
          <path d="${EVENTOMAX_LOGO_NAVY_PATH}" fill="#031c43" fill-rule="evenodd" />
        </svg>
        <h1 class="hero-title">Orden de Trabajo Técnica</h1>
        <p class="hero-sub">Hoja de Ruta de Cuadrilla · Operaciones de Montaje</p>
      </div>
      <div class="hero-right">
        <span class="folio-pill">${escapeHtml(folioShort)} · Producción #${escapeHtml(ticket.productionId)}</span>
        <div class="hero-meta">
          <div><strong>Emisión:</strong> ${escapeHtml(issuedCl.full)}</div>
          <div><strong>Trazabilidad:</strong> <span class="mono">${escapeHtml(docCode)}</span></div>
        </div>
      </div>
    </header>

    <section class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-k">Estado al Emitir Ticket</div>
        <div class="kpi-v"><span class="dot dot-blue"></span>${escapeHtml(emitStatusDisplay)}</div>
        <div class="kpi-s">Ticket #${escapeHtml(ticket.id)} (histórico)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-k">Estado Actual Producción</div>
        <div class="kpi-v"><span class="dot dot-slate"></span>${escapeHtml(currentStatusDisplay)}</div>
        <div class="kpi-s">${escapeHtml(currentStatusContext)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-k">Fecha Programada</div>
        <div class="kpi-v">${escapeHtml(scheduled.kpiMain)}</div>
        <div class="kpi-s">${escapeHtml(scheduled.kpiSub)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-k">Equipamiento Reservado</div>
        <div class="kpi-v"><span class="dot dot-amber"></span>${escapeHtml(kpiEquipmentValue)}</div>
        <div class="kpi-s">Despacho: Sin registro disponible</div>
      </div>
    </section>

    <section class="cards-2">
      <div class="card">
        <p class="card-eyebrow">Información del Evento</p>
        <h2 class="card-heading">${escapeHtml(ticket.productionName || `Producción #${ticket.productionId}`)}</h2>
        <table class="kv-clean">
          <tr>
            <td class="k">Ubicación</td>
            <td class="v">${escapeHtml(ticket.location || 'No disponible')}</td>
          </tr>
          <tr>
            <td class="k">Organizador</td>
            <td class="v"><strong>${escapeHtml(organizerNameDisplay)}</strong></td>
          </tr>
          <tr>
            <td class="k">ID Organizador</td>
            <td class="v muted">${escapeHtml(organizerIdDisplay)}</td>
          </tr>
        </table>
        ${
          closedBeforeScheduledDate
            ? `<div class="context-note">Nota: producción cerrada antes de la fecha programada (datos de origen sin alteración).</div>`
            : ''
        }
      </div>

      <div class="card">
        <p class="card-eyebrow">Asignación de Cuadrilla</p>
        <h2 class="card-heading">${escapeHtml(historicalCrewName || 'Sin registro')}</h2>
        <table class="kv-clean">
          <tr>
            <td class="k">ID Cuadrilla</td>
            <td class="v">${historicalCrewId ? `<span class="id-tag">${escapeHtml(historicalCrewId)}</span>` : '<span class="muted">No disponible</span>'}</td>
          </tr>
          <tr>
            <td class="k">Jefe de Cuadrilla</td>
            <td class="v muted">Sin registro (completar en terreno)</td>
          </tr>
          <tr>
            <td class="k">Producción</td>
            <td class="v mono">#${escapeHtml(ticket.productionId)} · Folio ${escapeHtml(folioShort)}</td>
          </tr>
          <tr>
            <td class="k">Fecha Programada</td>
            <td class="v">${escapeHtml(scheduled.full)}</td>
          </tr>
        </table>
        ${
          showCurrentCrewDiff
            ? `<div class="context-note">Cuadrilla vigente en producción: <strong>${escapeHtml(currentCrewName || 'Sin registro')}</strong>${currentCrewId ? ` (${escapeHtml(currentCrewId)})` : ''}.</div>`
            : ''
        }
      </div>
    </section>

    <section class="inst-strip">
      <div>
        <div class="inst-k">Instrucciones Operativas</div>
        <p class="inst-v">${escapeHtml(directiveText)}</p>
      </div>
      <div class="inst-obs">
        <div class="inst-k" style="color:#475569;">Observaciones de Montaje</div>
        <div>Sin registro. Pendiente de completar en terreno si corresponde.</div>
      </div>
    </section>

    <section class="table-card">
      <div class="table-top">
        <span class="table-title">Manifiesto de Equipamiento (Catálogo)</span>
        <span class="table-note">Inventario reservado · Despacho: Sin registro disponible</span>
      </div>
      <table class="modern">
        <thead>
          <tr>
            <th class="c" style="width:5%;">Ítem</th>
            <th class="c" style="width:10%;">ID Equipo</th>
            <th style="width:33%;">Descripción del Equipamiento</th>
            <th class="c" style="width:16%;">Reserva</th>
            <th class="c" style="width:11%;">Cantidad</th>
            <th class="c" style="width:11%;">Estado</th>
            <th style="width:14%;">Observaciones</th>
          </tr>
        </thead>
        <tbody>
          ${reservationsRows}
        </tbody>
      </table>
      <div class="table-foot">
        <span><strong>Total reservado:</strong> ${totalItems > 0 ? `${escapeHtml(itemsLabel)} (${escapeHtml(unitsLabel)})` : 'Sin reservas registradas'}</span>
        <span><strong>Despacho:</strong> Sin registro disponible en el sistema</span>
      </div>
    </section>

    <section class="field-row">
      <div class="card">
        <p class="card-eyebrow">Control de Montaje y Despacho</p>
        <ul class="chk-list">
          <li><span><span class="box-c"></span>Verificación de equipamiento</span><span class="pend-soft">Pendiente</span></li>
          <li><span><span class="box-c"></span>Inspección física previa</span><span class="pend-soft">Pendiente</span></li>
          <li><span><span class="box-c"></span>Entrega de materiales</span><span class="pend-soft">Pendiente</span></li>
          <li><span><span class="box-c"></span>Recepción en terreno</span><span class="pend-soft">Pendiente</span></li>
        </ul>
        <div class="mini-inputs">
          <div class="mini-line">Fecha/Hora recepción:</div>
          <div class="mini-line">Resp. entrega:</div>
          <div class="mini-line">Resp. recepción:</div>
          <div class="mini-line">Incidencias:</div>
        </div>
      </div>

      <div class="card">
        <p class="card-eyebrow">Seguridad Operativa</p>
        <div class="sec-guide">Directrices recomendadas. Marcar únicamente tras verificación real en terreno.</div>
        <ul class="chk-list">
          <li><span><span class="box-c"></span><strong>EPP requerido:</strong> calzado, guantes, chaleco</span><span class="pend-soft">Sin registro</span></li>
          <li><span><span class="box-c"></span><strong>Verificación eléctrica:</strong> tierra y diferencial</span><span class="pend-soft">Sin registro</span></li>
          <li><span><span class="box-c"></span><strong>Revisión de conexiones:</strong> energía y sonido</span><span class="pend-soft">Sin registro</span></li>
          <li><span><span class="box-c"></span><strong>Condiciones del recinto:</strong> accesos y despeje</span><span class="pend-soft">Sin registro</span></li>
        </ul>
        <div class="mini-inputs" style="margin-top:5px;padding-top:5px;">
          <div class="mini-line full">Observaciones de seguridad:</div>
        </div>
      </div>
    </section>

    <div class="closing-block">
      <section class="conf-section">
        <div class="conf-section-lbl">
          <span>Conformidad y Custodia en Terreno</span>
          <span class="conf-section-sub">Espacios en blanco para firma manual · Sin firma electrónica registrada</span>
        </div>
        <div class="conf-grid-3">
          <div class="conf-card">
            <div class="conf-t">Entrega / Despacho Bodega</div>
            <div class="conf-s">Retiro físico de equipamiento</div>
            <div class="conf-pad"></div>
            <div class="conf-meta">Nombre: ___________________<br />Fecha/Hora: _______________</div>
          </div>
          <div class="conf-card">
            <div class="conf-t">Responsable de Cuadrilla</div>
            <div class="conf-s">${escapeHtml(historicalCrewName || 'Pendiente de completar en terreno')}</div>
            <div class="conf-pad"></div>
            <div class="conf-meta">Nombre: ___________________<br />Fecha/Hora: _______________</div>
          </div>
          <div class="conf-card">
            <div class="conf-t">Recepción en Terreno / Producción</div>
            <div class="conf-s">Conformidad de montaje</div>
            <div class="conf-pad"></div>
            <div class="conf-meta">Nombre: ___________________<br />Fecha/Hora: _______________</div>
          </div>
        </div>
      </section>

      <section class="trace-wrap">
        <div class="trace-text">
          <div class="trace-eyebrow">Trazabilidad Operativa Interna</div>
          <div><strong>Sistema Emisor:</strong> EventoMax · Cola q.cmd.crew (ms-eventomax-notify) &nbsp;|&nbsp; <strong>Código:</strong> <span class="mono">${escapeHtml(docCode)}</span></div>
          <div><strong>Evento RabbitMQ:</strong> <span class="mono">${escapeHtml(ticket.eventId || 'No disponible')}</span> &nbsp;|&nbsp; <strong>Registro UTC:</strong> <span class="mono">${escapeHtml(issuedUtc)}</span></div>
          <div class="trace-disclaimer">Documento operativo interno sin validez tributaria ni timbre SII. El código QR codifica metadatos de trazabilidad interna del ticket; no constituye validación criptográfica ni verificación en línea.</div>
        </div>
        <div class="qr-box">
          ${qrSvg}
          <span class="qr-cap">QR Interno</span>
        </div>
      </section>
    </div>
  </main>
</body>
</html>`;
}

let savedDocumentTitle: string | null = null;
let pendingPrintFrameId: number | null = null;

function cancelPendingPrintFrame(): void {
  if (pendingPrintFrameId !== null) {
    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(pendingPrintFrameId);
    }
    pendingPrintFrameId = null;
  }
}

function restoreMainDocumentTitle(): void {
  if (typeof document !== 'undefined' && savedDocumentTitle !== null) {
    document.title = savedDocumentTitle;
    savedDocumentTitle = null;
  }
}

export function removeExistingCrewTicketPrintFrame(): void {
  cancelPendingPrintFrame();
  if (typeof document === 'undefined') return;
  restoreMainDocumentTitle();
  document
    .querySelectorAll('iframe[data-print-frame="crew-ticket"]')
    .forEach((frame) => frame.remove());
}

export function triggerCrewTicketPrint(data: CrewTicketPrintData): void {
  if (typeof document === 'undefined') return;
  removeExistingCrewTicketPrintFrame();

  const folio = `OT-${String(data.ticket.id).padStart(4, '0')}`;
  const docTitle = `Orden-Cuadrilla-Produccion-${data.ticket.productionId}-${folio}`;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('data-print-frame', 'crew-ticket');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  });

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(buildCrewTicketPrintHtml(data));
  doc.close();

  const invokePrint = (): void => {
    pendingPrintFrameId = null;
    if (!iframe.isConnected) {
      restoreMainDocumentTitle();
      return;
    }
    savedDocumentTitle = document.title;
    document.title = docTitle;
    if (typeof window !== 'undefined') {
      window.addEventListener('afterprint', restoreMainDocumentTitle, { once: true });
    }
    win.addEventListener('afterprint', restoreMainDocumentTitle, { once: true });
    try {
      win.focus();
      if (typeof win.print === 'function') {
        win.print();
      } else {
        restoreMainDocumentTitle();
      }
    } catch {
      restoreMainDocumentTitle();
    }
  };

  if (typeof requestAnimationFrame === 'function') {
    pendingPrintFrameId = requestAnimationFrame(() => invokePrint());
  } else {
    invokePrint();
  }
}

/** Backward-compatible alias for existing callers */
export const triggerCrewTicketSinglePagePrint = triggerCrewTicketPrint;
