import cv2
import numpy as np
import random


class PoissonBlender:

    @staticmethod
    def blend(source_img, target_img, mask, debug=False):

        if len(mask.shape) == 3:

            mask = cv2.cvtColor(
                mask,
                cv2.COLOR_BGR2GRAY
            )

        _, mask = cv2.threshold(
            mask,
            10,
            255,
            cv2.THRESH_BINARY
        )

        ys, xs = np.where(mask > 0)

        if len(xs) == 0:

            print("EMPTY MASK")

            # return image + no bbox
            return target_img, None

        x1, x2 = xs.min(), xs.max()
        y1, y2 = ys.min(), ys.max()

        defect = source_img[
            y1:y2,
            x1:x2
        ]

        defect_mask = mask[
            y1:y2,
            x1:x2
        ]

        if defect.size == 0:

            print("EMPTY DEFECT")

            return target_img, None

        dh, dw = defect.shape[:2]

        th, tw = target_img.shape[:2]

        if dh < 5 or dw < 5:

            print("DEFECT TOO SMALL")

            return target_img, None

        # enlarge mask
        defect_mask = cv2.dilate(

            defect_mask,
            np.ones((7, 7), np.uint8),
            1

        )

        # random placement
        cx = random.randint(
            dw // 2,
            tw - dw // 2
        )

        cy = random.randint(
            dh // 2,
            th - dh // 2
        )

        try:

            output = cv2.seamlessClone(

                defect,
                target_img,
                defect_mask,
                (cx, cy),
                cv2.MIXED_CLONE

            )

        except Exception as e:

            print("POISSON ERROR:", e)

            return target_img, None

        diff = np.mean(

            cv2.absdiff(
                output,
                target_img
            )

        )

        print("PIXEL DIFF:", diff)

        # ============================================
        # ⭐ NEW — COMPUTE BOUNDING BOX
        # ============================================

        xmin = int(cx - dw // 2)
        ymin = int(cy - dh // 2)

        xmax = int(cx + dw // 2)
        ymax = int(cy + dh // 2)

        # clamp bounds

        xmin = max(0, xmin)
        ymin = max(0, ymin)

        xmax = min(tw - 1, xmax)
        ymax = min(th - 1, ymax)

        bbox = [

            xmin,
            ymin,
            xmax,
            ymax

        ]

        # return both

        return output, bbox